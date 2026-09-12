package com.egyetemkapu.service;

import com.egyetemkapu.dto.FlyerDetailDto;
import com.egyetemkapu.dto.FlyerSearchHitDto;
import com.egyetemkapu.dto.FlyerSummaryDto;
import com.egyetemkapu.model.Flyer;
import com.egyetemkapu.model.FlyerPage;
import com.egyetemkapu.model.FlyerProduct;
import com.egyetemkapu.repository.FlyerRepository;
import com.egyetemkapu.service.flyer.FlyerExtractorRegistry;
import com.egyetemkapu.service.flyer.FlyerProductExtractor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class FlyerQueryService {

    private final FlyerRepository flyerRepository;
    private final FlyerSyncService flyerSyncService;
    private final Clock clock;
    private final FlyerExtractorRegistry extractors;
    private static final List<String> STORE_ORDER = List.of("spar", "penny", "tesco", "aldi");

    public FlyerQueryService(
            FlyerRepository flyerRepository,
            FlyerSyncService flyerSyncService,
            Clock clock,
            FlyerExtractorRegistry extractors) {
        this.flyerRepository = flyerRepository;
        this.flyerSyncService = flyerSyncService;
        this.clock = clock;
        this.extractors = extractors;
    }

    @Transactional
    public List<FlyerSummaryDto> list(String store) {
        refreshIfStale();
        LocalDate today = LocalDate.now(clock);
        List<Flyer> flyers = store == null || store.isBlank()
                ? flyerRepository.findAllByOrderByStoreAscTitleAsc()
                : flyerRepository.findByStoreOrderByValidFromDescTitleAsc(store.toLowerCase());
        return flyers.stream()
                .filter(flyer -> listed(flyer, today))
                .sorted(displayOrder(today))
                .map(FlyerSummaryDto::from)
                .toList();
    }

    @Transactional
    public FlyerDetailDto get(Long id) {
        Flyer flyer = flyerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Nincs ilyen akciós újság."));
        if (!flyerSyncService.refreshStoredLayout(flyer)) {
            reparseProductsFromPageText(flyer);
        }
        return FlyerDetailDto.from(flyer);
    }

    @Transactional
    public List<FlyerSearchHitDto> search(String query) {
        refreshIfStale();
        if (query == null || HungarianText.normalize(query).isEmpty()) {
            return List.of();
        }
        List<FlyerSearchHitDto> hits = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        LocalDate today = LocalDate.now(clock);
        for (Flyer flyer : flyerRepository.findAllByOrderByStoreAscTitleAsc()) {
            if (!listed(flyer, today)) {
                continue;
            }
            if (flyer.getProducts() != null) {
                for (FlyerProduct product : flyer.getProducts()) {
                    if (!HungarianText.contains(product.getName(), query)) {
                        continue;
                    }
                    String key = flyer.getId() + ":product:" + product.getId();
                    if (seen.add(key)) {
                        hits.add(new FlyerSearchHitDto(
                                flyer.getId(),
                                flyer.getStore(),
                                flyer.getTitle(),
                                product.getPageNumber(),
                                product.getName(),
                                HungarianText.snippet(product.getName(), query, 80),
                                "product",
                                product.getId()
                        ));
                    }
                }
            }
            if (flyer.getPages() != null) {
                for (FlyerPage page : flyer.getPages()) {
                    if (!HungarianText.contains(page.getPageText(), query)) {
                        continue;
                    }
                    String key = flyer.getId() + ":page:" + page.getPageNumber();
                    if (seen.add(key)) {
                        hits.add(new FlyerSearchHitDto(
                                flyer.getId(),
                                flyer.getStore(),
                                flyer.getTitle(),
                                page.getPageNumber(),
                                null,
                                HungarianText.snippet(page.getPageText(), query, 90),
                                "page",
                                null
                        ));
                    }
                }
            }
        }
        return hits.size() > 80 ? hits.subList(0, 80) : hits;
    }

    private void reparseProductsFromPageText(Flyer flyer) {
        if (flyer.getPages() == null || flyer.getPages().isEmpty()) {
            return;
        }
        List<FlyerCatalogParser.ParsedProduct> incoming = new ArrayList<>();
        Set<Integer> replacePages = new LinkedHashSet<>();
        FlyerProductExtractor extractor = extractors.forStore(flyer.getStore());
        for (FlyerPage page : flyer.getPages()) {
            List<FlyerCatalogParser.ParsedProduct> parsed =
                    extractor.extractFromPageText(page.getPageText(), page.getPageNumber());
            List<String> storedNames = flyer.getProducts() == null
                    ? List.of()
                    : flyer.getProducts().stream()
                            .filter(product -> product.getPageNumber() == page.getPageNumber())
                            .map(FlyerProduct::getName)
                            .toList();
            if (FlyerCatalogParser.shouldReplaceStoredProducts(storedNames, parsed)) {
                replacePages.add(page.getPageNumber());
                incoming.addAll(parsed);
            }
        }
        if (replacePages.isEmpty()) {
            return;
        }
        flyer.getProducts().removeIf(product -> replacePages.contains(product.getPageNumber()));
        for (FlyerCatalogParser.ParsedProduct product : incoming) {
            FlyerProduct entity = new FlyerProduct();
            entity.setPageNumber(product.pageNumber());
            entity.setName(limit(product.name(), 500));
            entity.setImageUrl(limit(product.imageUrl(), 2000));
            flyer.addProduct(entity);
        }
        flyerRepository.save(flyer);
    }

    private static String limit(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }

    private void refreshIfStale() {
        if (flyerSyncService.isStale(LocalDateTime.now(clock))) {
            flyerSyncService.refreshAsync();
        }
    }

    private static boolean listed(Flyer flyer, LocalDate today) {
        if (flyer.getPages() == null || flyer.getPages().isEmpty()) {
            return false;
        }
        return FlyerCatalogParser.isCurrentOrUpcoming(flyer.getValidFrom(), flyer.getValidTo(), today);
    }

    private static Comparator<Flyer> displayOrder(LocalDate today) {
        return Comparator
                .comparing((Flyer flyer) -> !FlyerCatalogParser.isCurrentlyValid(
                        flyer.getValidFrom(), flyer.getValidTo(), today))
                .thenComparingInt(flyer -> storeRank(flyer.getStore()))
                .thenComparingInt(FlyerQueryService::paperKind)
                .thenComparing(Flyer::getValidFrom, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(Flyer::getTitle, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
    }

    static int storeRank(String store) {
        int index = STORE_ORDER.indexOf(store == null ? "" : store.toLowerCase());
        return index < 0 ? STORE_ORDER.size() : index;
    }

    static int paperKind(Flyer flyer) {
        String hay = ((flyer.getSourceKey() == null ? "" : flyer.getSourceKey()) + " "
                + (flyer.getOfficialUrl() == null ? "" : flyer.getOfficialUrl()) + " "
                + (flyer.getTitle() == null ? "" : flyer.getTitle())).toLowerCase();
        if ("aldi".equals(flyer.getStore())) {
            if (hay.contains("online")) {
                return 0;
            }
            if (hay.contains("kozepso") || hay.contains("középső")) {
                return 1;
            }
            return 2;
        }
        if ("spar".equals(flyer.getStore())) {
            if (hay.contains(":interspar:") || hay.contains("/interspar/") || hay.contains("interspar")) {
                return 1;
            }
            if (hay.contains(":spar-market:") || hay.contains("/spar-market/") || hay.contains("market")) {
                return 2;
            }
            return 0;
        }
        if ("tesco".equals(flyer.getStore())) {
            if (hay.contains(":sm:") || hay.contains("/szupermarket/") || hay.contains("szupermarket")) {
                return 1;
            }
            if (hay.contains(":cat:") || hay.contains("/katalogusok/katalogus/") || hay.contains("katalógus")) {
                return 2;
            }
            return 0;
        }
        return 0;
    }
}

package com.egyetemkapu.service;

import com.egyetemkapu.dto.FlyerDetailDto;
import com.egyetemkapu.dto.FlyerSearchHitDto;
import com.egyetemkapu.dto.FlyerSummaryDto;
import com.egyetemkapu.model.Flyer;
import com.egyetemkapu.model.FlyerPage;
import com.egyetemkapu.model.FlyerProduct;
import com.egyetemkapu.repository.FlyerRepository;
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

    public FlyerQueryService(FlyerRepository flyerRepository, FlyerSyncService flyerSyncService, Clock clock) {
        this.flyerRepository = flyerRepository;
        this.flyerSyncService = flyerSyncService;
        this.clock = clock;
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
        refreshIfStale();
        Flyer flyer = flyerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Nincs ilyen akciós újság."));
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
                    if (!HungarianText.contains(product.getName(), query)
                            && !HungarianText.contains(product.getPriceText(), query)) {
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
                                product.getPriceText(),
                                HungarianText.snippet(product.getName() + " " + nullToEmpty(product.getPriceText()), query, 80),
                                "product"
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
                                null,
                                HungarianText.snippet(page.getPageText(), query, 90),
                                "page"
                        ));
                    }
                }
            }
        }
        return hits.size() > 80 ? hits.subList(0, 80) : hits;
    }

    private void refreshIfStale() {
        if (flyerSyncService.isStale(LocalDateTime.now(clock))) {
            flyerSyncService.refreshAsync();
        }
    }

    private static boolean listed(Flyer flyer, LocalDate today) {
        return FlyerCatalogParser.isCurrentOrUpcoming(flyer.getValidFrom(), flyer.getValidTo(), today);
    }

    private static Comparator<Flyer> displayOrder(LocalDate today) {
        return Comparator
                .comparing((Flyer flyer) -> !FlyerCatalogParser.isCurrentlyValid(
                        flyer.getValidFrom(), flyer.getValidTo(), today))
                .thenComparing(Flyer::getStore, Comparator.nullsLast(String::compareTo))
                .thenComparingInt(FlyerQueryService::paperKind)
                .thenComparing(Flyer::getValidFrom, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(Flyer::getTitle, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
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
        return 0;
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}

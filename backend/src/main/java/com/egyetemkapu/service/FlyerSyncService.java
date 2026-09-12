package com.egyetemkapu.service;

import com.egyetemkapu.model.Flyer;
import com.egyetemkapu.model.FlyerPage;
import com.egyetemkapu.model.FlyerProduct;
import com.egyetemkapu.repository.FlyerRepository;
import com.egyetemkapu.service.FlyerCatalogParser.DiscoveredPaper;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedCatalog;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedPage;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;
import com.egyetemkapu.service.flyer.FlyerExtractorRegistry;
import com.egyetemkapu.service.flyer.FlyerProductExtractor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class FlyerSyncService {

    private static final Logger log = LoggerFactory.getLogger(FlyerSyncService.class);
    private static final List<String> STORES = List.of("aldi", "spar", "penny", "tesco");
    private static final String TESCO_GRAPHQL = "https://api.prod.retail.tesco.com/marketing/leaflets-be/graphql";
    private static final int PRODUCT_PARSER_GENERATION = 5;

    private final FlyerRepository flyerRepository;
    private final FlyerPersistenceService flyerPersistenceService;
    private final FlyerHttpClient httpClient;
    private final FlyerCatalogParser parser;
    private final FlyerPdfExtractor pdfExtractor;
    private final FlyerExtractorRegistry extractors;
    private final Clock clock;
    private final AtomicBoolean syncing = new AtomicBoolean(false);
    private final ConcurrentHashMap<Long, Integer> layoutApplied = new ConcurrentHashMap<>();
    private volatile LocalDateTime lastLayoutRetryAt;

    public FlyerSyncService(
            FlyerRepository flyerRepository,
            FlyerPersistenceService flyerPersistenceService,
            FlyerHttpClient httpClient,
            FlyerCatalogParser parser,
            FlyerPdfExtractor pdfExtractor,
            FlyerExtractorRegistry extractors,
            Clock clock) {
        this.flyerRepository = flyerRepository;
        this.flyerPersistenceService = flyerPersistenceService;
        this.httpClient = httpClient;
        this.parser = parser;
        this.pdfExtractor = pdfExtractor;
        this.extractors = extractors;
        this.clock = clock;
    }

    @Scheduled(cron = "0 30 6 * * *", zone = "Europe/Budapest")
    public void scheduledSync() {
        syncAll();
    }

    @Async
    public void refreshAsync() {
        syncAll();
    }

    public void syncAll() {
        if (!syncing.compareAndSet(false, true)) {
            return;
        }
        try {
            LocalDate today = LocalDate.now(clock);
            syncAldi(today);
            syncSpar(today);
            syncPenny(today);
            syncTesco(today);
        } finally {
            lastLayoutRetryAt = LocalDateTime.now(clock);
            syncing.set(false);
        }
    }

    public void syncAldi(LocalDate today) {
        try {
            String html = httpClient.getText("https://www.aldi.hu/online-akcios-ujsag");
            List<DiscoveredPaper> papers = parser.discoverAldiPublications(html, today);
            List<ParsedCatalog> catalogs = new ArrayList<>();
            for (DiscoveredPaper paper : papers) {
                String dataJson = safeText(trimUrl(paper.officialUrl()) + "data.json");
                String spreadsJson = safeText(trimUrl(paper.officialUrl()) + "spreads.json");
                ParsedCatalog catalog = parser.parsePublitas(paper, dataJson, spreadsJson);
                if (catalog.pages().isEmpty() && catalog.paper().pdfUrl() != null) {
                    catalog = withPdfPages(catalog, extractors.forStore("aldi"));
                }
                catalog = extractors.forStore("aldi").fillProducts(catalog);
                if (keepCatalog(catalog, today)) {
                    catalogs.add(catalog);
                }
            }
            flyerPersistenceService.replaceStore("aldi", catalogs, LocalDateTime.now(clock));
        } catch (Exception e) {
            log.warn("ALDI flyer sync failed: {}", e.getMessage());
        }
    }

    public void syncSpar(LocalDate today) {
        try {
            String html = safeText("https://www.spar.hu/ajanlatok");
            List<DiscoveredPaper> papers = parser.discoverSparPdfs(html, today);
            List<ParsedCatalog> catalogs = new ArrayList<>();
            for (DiscoveredPaper paper : papers) {
                if (catalogs.size() >= 6) {
                    break;
                }
                if (!FlyerCatalogParser.isCurrentOrUpcoming(paper.validFrom(), paper.validTo(), today)) {
                    continue;
                }
                try {
                    ParsedCatalog catalog = extractSparCatalog(paper);
                    if (catalog != null) {
                        catalogs.add(catalog);
                    }
                } catch (Exception e) {
                    log.warn("SPAR flyer failed for {} ({})", paper.title(), e.getMessage());
                } catch (OutOfMemoryError e) {
                    log.warn("SPAR flyer ran out of memory for {}", paper.title());
                }
            }
            flyerPersistenceService.replaceStore("spar", catalogs, LocalDateTime.now(clock));
        } catch (Exception e) {
            log.warn("SPAR flyer sync failed: {}", e.getMessage());
        }
    }

    public void syncPenny(LocalDate today) {
        try {
            String html = safeText("https://www.penny.hu/ajanlatok");
            String reklam = safeText("https://www.penny.hu/reklamujsag");
            List<DiscoveredPaper> papers = parser.discoverPennyPapers(html + "\n" + reklam, today);
            List<ParsedCatalog> catalogs = new ArrayList<>();
            for (DiscoveredPaper paper : papers) {
                ParsedCatalog catalog;
                if (FlyerCatalogParser.isPennyReweUrl(paper.officialUrl())) {
                    String leafletHtml = safeText(trimUrl(paper.officialUrl()));
                    if (!FlyerCatalogParser.looksLikePennyLeaflet(leafletHtml)) {
                        continue;
                    }
                    catalog = withPennyPageTexts(parser.parsePennyLeaflet(paper, leafletHtml), leafletHtml);
                } else if (paper.officialUrl().contains("publitas") || paper.officialUrl().contains("szorolap")) {
                    String dataJson = safeText(trimUrl(paper.officialUrl()) + "data.json");
                    String spreadsJson = safeText(trimUrl(paper.officialUrl()) + "spreads.json");
                    catalog = extractors.forStore("penny").fillProducts(
                            parser.parsePublitas(paper, dataJson, spreadsJson));
                } else if (paper.pdfUrl() != null) {
                    FlyerProductExtractor extractor = extractors.forStore("penny");
                    List<ParsedPage> pages = pdfExtractor.extractPages(safeBytes(paper.pdfUrl()), extractor);
                    catalog = extractor.fillProducts(new ParsedCatalog(paper, pages, List.of()));
                } else {
                    continue;
                }
                if (keepCatalog(catalog, today) && (!catalog.pages().isEmpty() || !catalog.products().isEmpty())) {
                    catalogs.add(catalog);
                }
            }
            if (catalogs.isEmpty()) {
                List<ParsedProduct> products = parser.extractHtmlProducts(html + "\n" + reklam);
                if (!products.isEmpty()) {
                    DiscoveredPaper offers = new DiscoveredPaper(
                            "penny",
                            "PENNY aktuális ajánlatok",
                            "https://www.penny.hu/ajanlatok",
                            null,
                            "penny:ajanlatok",
                            today.minusDays(3),
                            today.plusDays(4)
                    );
                    catalogs.add(new ParsedCatalog(
                            offers,
                            List.of(new ParsedPage(1, null, joinNames(products))),
                            products
                    ));
                }
            }
            flyerPersistenceService.replaceStore("penny", catalogs, LocalDateTime.now(clock));
        } catch (Exception e) {
            log.warn("PENNY flyer sync failed: {}", e.getMessage());
        }
    }

    public void syncTesco(LocalDate today) {
        if (recentlySynced("tesco") && !tescoProductsLookWrong()) {
            return;
        }
        try {
            String json = safePostJson(TESCO_GRAPHQL, parser.tescoGraphqlBody(today));
            List<ParsedCatalog> catalogs = new ArrayList<>();
            for (ParsedCatalog catalog : parser.parseTescoGraphql(json, today)) {
                ParsedCatalog withProducts = tescoWithProducts(catalog);
                if (withProducts.pages().isEmpty() && withProducts.products().isEmpty()) {
                    continue;
                }
                catalogs.add(withProducts);
            }
            if (!catalogs.isEmpty()) {
                flyerPersistenceService.replaceStore("tesco", catalogs, LocalDateTime.now(clock));
            }
        } catch (Exception e) {
            log.warn("Tesco flyer sync failed: {}", e.getMessage());
        }
    }

    public boolean isStale(LocalDateTime now) {
        if (syncing.get()) {
            return false;
        }
        List<Flyer> flyers = flyerRepository.findAll();
        if (flyers.isEmpty()) {
            return true;
        }
        boolean aged = flyers.stream()
                .map(Flyer::getLastSynced)
                .min(LocalDateTime::compareTo)
                .map(synced -> synced.isBefore(now.minusHours(12)))
                .orElse(true);
        if (aged) {
            return true;
        }
        if (missingCoreCatalogs(flyers, now.toLocalDate())) {
            return true;
        }
        if (lastLayoutRetryAt != null && lastLayoutRetryAt.isAfter(now.minusMinutes(30))) {
            return false;
        }
        return flyers.stream().anyMatch(FlyerSyncService::publitasPagesMissingImages)
                || flyers.stream().anyMatch(FlyerSyncService::aldiPagesMissingProducts)
                || pendingLayoutResync();
    }

    public boolean refreshStoredLayout(Flyer flyer) {
        if (flyer == null || !usesPdfLayout(flyer.getStore())) {
            return false;
        }
        Long id = flyer.getId();
        if (id != null && Integer.valueOf(PRODUCT_PARSER_GENERATION).equals(layoutApplied.get(id))) {
            return true;
        }
        byte[] pdf = downloadFlyerPdf(flyer);
        if (pdf.length == 0) {
            return false;
        }
        FlyerProductExtractor extractor = extractors.forStore(flyer.getStore());
        FlyerPdfExtractor.ExtractedDocument extracted = pdfExtractor.extractDocument(pdf, extractor);
        if (extracted.pages().isEmpty()) {
            return false;
        }
        List<ParsedProduct> products = new ArrayList<>(extracted.products());
        if (products.isEmpty()) {
            for (ParsedPage page : extracted.pages()) {
                products.addAll(extractor.extractFromPageText(page.text(), page.pageNumber()));
            }
        }
        if (products.isEmpty()) {
            return false;
        }
        Map<Integer, String> texts = new java.util.HashMap<>();
        for (ParsedPage page : extracted.pages()) {
            texts.put(page.pageNumber(), page.text());
        }
        if (flyer.getPages() != null) {
            for (FlyerPage page : flyer.getPages()) {
                String text = texts.get(page.getPageNumber());
                if (text != null && !text.isBlank()) {
                    page.setPageText(text);
                }
            }
        }
        flyer.getProducts().clear();
        for (ParsedProduct product : products) {
            FlyerProduct entity = new FlyerProduct();
            entity.setPageNumber(product.pageNumber());
            entity.setName(limit(product.name(), 500));
            entity.setImageUrl(limit(product.imageUrl(), 2000));
            flyer.addProduct(entity);
        }
        flyerRepository.save(flyer);
        if (id != null) {
            layoutApplied.put(id, PRODUCT_PARSER_GENERATION);
        }
        log.info("Re-extracted {} flyer {} with {} products", flyer.getStore(), flyer.getTitle(), products.size());
        return true;
    }

    private boolean pendingLayoutResync() {
        if (!layoutLooksWrong()) {
            return false;
        }
        LocalDateTime now = LocalDateTime.now(clock);
        return lastLayoutRetryAt == null || lastLayoutRetryAt.isBefore(now.minusMinutes(15));
    }

    private boolean layoutLooksWrong() {
        return tescoProductsLookWrong() || sparProductsLookWrong()
                || aldiProductsLookWrong() || pennyProductsLookWrong();
    }

    public List<String> stores() {
        return STORES;
    }

    private static boolean missingCoreCatalogs(List<Flyer> flyers, LocalDate today) {
        return flyers.stream().noneMatch(flyer -> "spar".equals(flyer.getStore()))
                || missingWeeklySpar(flyers, today)
                || flyers.stream().noneMatch(FlyerSyncService::isPennyReweFlyer)
                || flyers.stream().noneMatch(flyer -> "tesco".equals(flyer.getStore()));
    }

    private static boolean missingWeeklySpar(List<Flyer> flyers, LocalDate today) {
        LocalDate thursday = today.with(DayOfWeek.THURSDAY);
        if (thursday.isAfter(today)) {
            thursday = thursday.minusWeeks(1);
        }
        String date = thursday.toString();
        return flyers.stream().noneMatch(flyer -> ("spar:spar:" + date).equals(flyer.getSourceKey()))
                || flyers.stream().noneMatch(flyer -> ("spar:interspar:" + date).equals(flyer.getSourceKey()))
                || flyers.stream().noneMatch(flyer -> ("spar:spar-market:" + date).equals(flyer.getSourceKey()));
    }

    private ParsedCatalog tescoWithProducts(ParsedCatalog catalog) {
        byte[] pdf = safeBytes(catalog.paper().pdfUrl(), catalog.paper().officialUrl());
        if (pdf.length == 0) {
            return catalog;
        }
        FlyerProductExtractor extractor = extractors.forStore("tesco");
        FlyerPdfExtractor.ExtractedDocument extracted = pdfExtractor.extractDocument(pdf, extractor);
        if (extracted.pages().isEmpty()) {
            return catalog;
        }
        Map<Integer, String> images = new java.util.HashMap<>();
        for (ParsedPage page : catalog.pages()) {
            images.put(page.pageNumber(), page.imageUrl());
        }
        List<ParsedPage> pages = new ArrayList<>();
        for (ParsedPage page : extracted.pages()) {
            String image = images.getOrDefault(page.pageNumber(), page.imageUrl());
            pages.add(new ParsedPage(page.pageNumber(), image, page.text()));
        }
        List<ParsedProduct> products = new ArrayList<>(extracted.products());
        if (products.isEmpty()) {
            for (ParsedPage page : pages) {
                products.addAll(extractor.extractFromPageText(page.text(), page.pageNumber()));
            }
        }
        return new ParsedCatalog(catalog.paper(), pages, products);
    }

    private byte[] downloadFlyerPdf(Flyer flyer) {
        if ("spar".equals(flyer.getStore())) {
            LinkedHashSet<String> urls = new LinkedHashSet<>();
            if (flyer.getPdfUrl() != null && !flyer.getPdfUrl().isBlank()) {
                urls.add(flyer.getPdfUrl());
            }
            if (flyer.getValidFrom() != null) {
                urls.addAll(parser.sparPdfCandidates(sparBrandFromSourceKey(flyer.getSourceKey()), flyer.getValidFrom()));
            }
            for (String url : urls) {
                byte[] bytes = safeBytes(url, sparPdfReferer());
                if (bytes.length > 0) {
                    return bytes;
                }
            }
            return new byte[0];
        }
        return safeBytes(flyer.getPdfUrl(), flyer.getOfficialUrl());
    }

    private static boolean usesPdfLayout(String store) {
        return "spar".equals(store) || "tesco".equals(store);
    }

    private static String sparBrandFromSourceKey(String sourceKey) {
        if (sourceKey == null) {
            return "spar";
        }
        String[] parts = sourceKey.split(":");
        if (parts.length >= 2 && !parts[1].isBlank()) {
            return parts[1];
        }
        return "spar";
    }

    private ParsedCatalog extractSparCatalog(DiscoveredPaper paper) {
        SparPdf pdf = downloadSparPdf(paper);
        if (pdf.bytes().length == 0) {
            return null;
        }
        FlyerProductExtractor extractor = extractors.forStore("spar");
        FlyerPdfExtractor.ExtractedDocument extracted = pdfExtractor.extractDocument(pdf.bytes(), extractor);
        if (extracted.pages().isEmpty()) {
            log.warn("SPAR PDF extract failed for {} ({} bytes)", paper.title(), pdf.bytes().length);
            return null;
        }
        List<ParsedPage> pages = extracted.pages();
        List<ParsedProduct> products = new ArrayList<>(extracted.products());
        if (products.isEmpty()) {
            for (ParsedPage page : pages) {
                products.addAll(extractor.extractFromPageText(page.text(), page.pageNumber()));
            }
        }
        DiscoveredPaper resolved = new DiscoveredPaper(
                paper.store(),
                paper.title(),
                paper.officialUrl(),
                pdf.url(),
                paper.sourceKey(),
                paper.validFrom(),
                paper.validTo()
        );
        return new ParsedCatalog(resolved, pages, products);
    }

    private SparPdf downloadSparPdf(DiscoveredPaper paper) {
        LinkedHashSet<String> urls = new LinkedHashSet<>();
        if (paper.pdfUrl() != null && !paper.pdfUrl().isBlank()) {
            urls.add(paper.pdfUrl());
        }
        urls.addAll(parser.sparPdfCandidates(FlyerCatalogParser.sparBrandOf(paper), paper.validFrom()));
        String referer = sparPdfReferer();
        for (String url : urls) {
            byte[] bytes = safeBytes(url, referer);
            if (bytes.length > 0) {
                return new SparPdf(url, bytes);
            }
        }
        log.warn("SPAR PDF missing for {} ({})", paper.title(), paper.officialUrl());
        return new SparPdf(paper.pdfUrl(), new byte[0]);
    }

    private static String sparPdfReferer() {
        return "https://www.spar.hu/ajanlatok";
    }

    private record SparPdf(String url, byte[] bytes) {
    }

    private static boolean keepCatalog(ParsedCatalog catalog, LocalDate today) {
        if (catalog == null || catalog.pages() == null || catalog.pages().isEmpty()) {
            return false;
        }
        return FlyerCatalogParser.isCurrentOrUpcoming(
                catalog.paper().validFrom(), catalog.paper().validTo(), today);
    }

    private ParsedCatalog withPennyPageTexts(ParsedCatalog catalog, String indexHtml) {
        FlyerProductExtractor extractor = extractors.forStore("penny");
        List<String> paragraphs = parser.extractPennyParagraphs(indexHtml);
        String base = trimUrl(catalog.paper().officialUrl());
        List<ParsedPage> pages = new ArrayList<>();
        List<ParsedProduct> products = new ArrayList<>();
        for (ParsedPage page : catalog.pages()) {
            String text = page.pageNumber() <= paragraphs.size()
                    ? paragraphs.get(page.pageNumber() - 1)
                    : "";
            if (text.isBlank() && page.pageNumber() > 1) {
                String html = safeText(base + parser.pennyPageRelPath(indexHtml, page.pageNumber()));
                List<String> remote = parser.extractPennyParagraphs(html);
                if (page.pageNumber() <= remote.size()) {
                    text = remote.get(page.pageNumber() - 1);
                } else if (!remote.isEmpty()) {
                    text = remote.getFirst();
                } else {
                    text = parser.extractPennyPageText(html);
                }
            }
            if (text.isBlank()) {
                text = page.text() == null ? "" : page.text();
            }
            pages.add(new ParsedPage(page.pageNumber(), page.imageUrl(), text));
            products.addAll(extractor.extractFromPageText(text, page.pageNumber()));
        }
        if (products.isEmpty()) {
            products.addAll(catalog.products());
        }
        return new ParsedCatalog(catalog.paper(), pages, products);
    }

    private boolean tescoProductsLookWrong() {
        return flyerRepository.findProductNamesByStore("tesco").stream().anyMatch(name ->
                HungarianText.contains(name, "töltsd")
                        || HungarianText.contains(name, "appot")
                        || HungarianText.contains(name, "többféle")
                        || HungarianText.contains(name, "olcsóbb")
                        || FlyerCatalogParser.isSloganName(name)
                        || FlyerCatalogParser.isWeakProductName(name));
    }

    private boolean sparProductsLookWrong() {
        return flyerRepository.findProductNamesByStore("spar").stream().anyMatch(name ->
                HungarianText.contains(name, "csont nélkül")
                        || HungarianText.contains(name, "kiszolgálópult")
                        || HungarianText.contains(name, "spórolás")
                        || HungarianText.contains(name, "kiszerelésben is")
                        || HungarianText.contains(name, "töltőtömeg")
                        || HungarianText.contains(name, "először")
                        || FlyerCatalogParser.isSloganName(name)
                        || FlyerCatalogParser.isWeakProductName(name)
                        || (name != null && name.trim().endsWith("(")));
    }

    private boolean aldiProductsLookWrong() {
        return flyerRepository.findProductNamesByStore("aldi").stream().anyMatch(name ->
                HungarianText.contains(name, "frisscsirke")
                        || FlyerCatalogParser.isSloganName(name)
                        || FlyerCatalogParser.isWeakProductName(name));
    }

    private boolean pennyProductsLookWrong() {
        return flyerRepository.findProductNamesByStore("penny").stream().anyMatch(name ->
                name != null && (name.matches("(?i)^\\d+\\s*x\\s+.*")
                        || (HungarianText.contains(name, "fokhagyma") && HungarianText.contains(name, "kelbimbó"))
                        || FlyerCatalogParser.isSloganName(name)
                        || FlyerCatalogParser.isWeakProductName(name)));
    }

    private boolean recentlySynced(String store) {
        LocalDateTime cutoff = LocalDateTime.now(clock).minusHours(12);
        return flyerRepository.findAll().stream()
                .filter(flyer -> store.equals(flyer.getStore()))
                .map(Flyer::getLastSynced)
                .anyMatch(synced -> synced != null && !synced.isBefore(cutoff));
    }

    private static boolean isPennyReweFlyer(Flyer flyer) {
        return "penny".equals(flyer.getStore()) && FlyerCatalogParser.isPennyReweUrl(flyer.getOfficialUrl());
    }

    private static boolean aldiPagesMissingProducts(Flyer flyer) {
        if (!"aldi".equals(flyer.getStore())) {
            return false;
        }
        boolean hasPages = flyer.getPages() != null && !flyer.getPages().isEmpty();
        boolean hasProducts = flyer.getProducts() != null && !flyer.getProducts().isEmpty();
        return hasPages && !hasProducts;
    }

    private static boolean publitasPagesMissingImages(Flyer flyer) {
        String url = flyer.getOfficialUrl();
        if (url == null || (!url.contains("szorolap") && !url.contains("publitas"))) {
            return false;
        }
        if (flyer.getPages() == null || flyer.getPages().isEmpty()) {
            return false;
        }
        return flyer.getPages().stream()
                .allMatch(page -> page.getImageUrl() == null || page.getImageUrl().isBlank());
    }

    private ParsedCatalog withPdfPages(ParsedCatalog catalog, FlyerProductExtractor extractor) {
        List<ParsedPage> pages = pdfExtractor.extractPages(safeBytes(catalog.paper().pdfUrl()), extractor);
        return new ParsedCatalog(catalog.paper(), pages, catalog.products());
    }

    private String safeText(String url) {
        if (!FlyerUrlPolicy.isAllowed(url)) {
            return "";
        }
        try {
            return httpClient.getText(url);
        } catch (Exception e) {
            log.debug("Flyer fetch failed for {}: {}", url, e.getMessage());
            return "";
        }
    }

    private String safePostJson(String url, String body) {
        if (!FlyerUrlPolicy.isAllowed(url)) {
            return "";
        }
        try {
            return httpClient.postJson(url, body);
        } catch (Exception e) {
            log.debug("Flyer POST failed for {}: {}", url, e.getMessage());
            return "";
        }
    }

    private byte[] safeBytes(String url) {
        return safeBytes(url, null);
    }

    private byte[] safeBytes(String url, String referer) {
        if (!FlyerUrlPolicy.isAllowed(url)) {
            return new byte[0];
        }
        try {
            return referer == null || referer.isBlank()
                    ? httpClient.getBytes(url)
                    : httpClient.getBytes(url, referer);
        } catch (Exception e) {
            log.debug("Flyer binary fetch failed for {}: {}", url, e.getMessage());
            return new byte[0];
        }
    }

    private static String limit(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }

    private static String joinNames(List<ParsedProduct> products) {
        StringBuilder text = new StringBuilder();
        for (ParsedProduct product : products) {
            if (!text.isEmpty()) {
                text.append(' ');
            }
            text.append(product.name());
        }
        return text.toString();
    }

    private static String trimUrl(String url) {
        return url.endsWith("/") ? url : url + "/";
    }
}

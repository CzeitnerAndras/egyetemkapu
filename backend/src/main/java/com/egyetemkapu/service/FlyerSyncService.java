package com.egyetemkapu.service;

import com.egyetemkapu.model.Flyer;
import com.egyetemkapu.repository.FlyerRepository;
import com.egyetemkapu.service.FlyerCatalogParser.DiscoveredPaper;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedCatalog;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedPage;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;
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
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class FlyerSyncService {

    private static final Logger log = LoggerFactory.getLogger(FlyerSyncService.class);
    private static final List<String> STORES = List.of("aldi", "spar", "penny", "tesco");
    private static final String TESCO_GRAPHQL = "https://api.prod.retail.tesco.com/marketing/leaflets-be/graphql";

    private final FlyerRepository flyerRepository;
    private final FlyerPersistenceService flyerPersistenceService;
    private final FlyerHttpClient httpClient;
    private final FlyerCatalogParser parser;
    private final FlyerPdfExtractor pdfExtractor;
    private final Clock clock;
    private final AtomicBoolean syncing = new AtomicBoolean(false);

    public FlyerSyncService(
            FlyerRepository flyerRepository,
            FlyerPersistenceService flyerPersistenceService,
            FlyerHttpClient httpClient,
            FlyerCatalogParser parser,
            FlyerPdfExtractor pdfExtractor,
            Clock clock) {
        this.flyerRepository = flyerRepository;
        this.flyerPersistenceService = flyerPersistenceService;
        this.httpClient = httpClient;
        this.parser = parser;
        this.pdfExtractor = pdfExtractor;
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
                    catalog = withPdfPages(catalog);
                }
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
            String html = httpClient.getText("https://www.spar.hu/ajanlatok");
            List<DiscoveredPaper> papers = parser.discoverSparPdfs(html, today);
            List<ParsedCatalog> catalogs = new ArrayList<>();
            for (DiscoveredPaper paper : papers) {
                if (catalogs.size() >= 6) {
                    break;
                }
                if (!FlyerCatalogParser.isCurrentOrUpcoming(paper.validFrom(), paper.validTo(), today)) {
                    continue;
                }
                SparPdf pdf = downloadSparPdf(paper);
                if (pdf.bytes().length == 0) {
                    continue;
                }
                List<ParsedPage> pages = pdfExtractor.extractPages(pdf.bytes());
                if (pages.isEmpty()) {
                    continue;
                }
                List<ParsedProduct> products = new ArrayList<>();
                for (ParsedPage page : pages) {
                    products.addAll(parser.extractPricedItems(page.text(), page.pageNumber()));
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
                catalogs.add(new ParsedCatalog(resolved, pages, products));
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
                    catalog = parser.parsePublitas(paper, dataJson, spreadsJson);
                } else if (paper.pdfUrl() != null) {
                    List<ParsedPage> pages = pdfExtractor.extractPages(safeBytes(paper.pdfUrl()));
                    catalog = new ParsedCatalog(paper, pages, List.of());
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
        if (recentlySynced("tesco")) {
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
        List<Flyer> flyers = flyerRepository.findAll();
        if (flyers.isEmpty()) {
            return true;
        }
        return flyers.stream()
                .map(Flyer::getLastSynced)
                .min(LocalDateTime::compareTo)
                .map(synced -> synced.isBefore(now.minusHours(12)))
                .orElse(true)
                || flyers.stream().noneMatch(flyer -> "spar".equals(flyer.getStore()))
                || missingWeeklySpar(flyers, now.toLocalDate())
                || flyers.stream().noneMatch(FlyerSyncService::isPennyReweFlyer)
                || flyers.stream().noneMatch(flyer -> "tesco".equals(flyer.getStore()))
                || flyers.stream().anyMatch(FlyerSyncService::publitasPagesMissingImages)
                || flyers.stream().anyMatch(FlyerSyncService::aldiPagesMissingProducts);
    }

    public List<String> stores() {
        return STORES;
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
        List<ParsedPage> rendered = pdfExtractor.extractPages(pdf);
        if (rendered.isEmpty()) {
            return catalog;
        }
        List<ParsedPage> pages = new ArrayList<>();
        List<ParsedProduct> products = new ArrayList<>();
        Map<Integer, String> images = new java.util.HashMap<>();
        for (ParsedPage page : catalog.pages()) {
            images.put(page.pageNumber(), page.imageUrl());
        }
        for (ParsedPage page : rendered) {
            String image = images.getOrDefault(page.pageNumber(), page.imageUrl());
            pages.add(new ParsedPage(page.pageNumber(), image, page.text()));
            products.addAll(parser.extractPricedItems(page.text(), page.pageNumber()));
        }
        if (pages.isEmpty()) {
            pages = catalog.pages();
        }
        return new ParsedCatalog(catalog.paper(), pages, products);
    }

    private SparPdf downloadSparPdf(DiscoveredPaper paper) {
        LinkedHashSet<String> urls = new LinkedHashSet<>();
        if (paper.pdfUrl() != null && !paper.pdfUrl().isBlank()) {
            urls.add(paper.pdfUrl());
        }
        urls.addAll(parser.sparPdfCandidates(FlyerCatalogParser.sparBrandOf(paper), paper.validFrom()));
        for (String url : urls) {
            byte[] bytes = safeBytes(url);
            if (bytes.length > 0) {
                return new SparPdf(url, bytes);
            }
        }
        return new SparPdf(paper.pdfUrl(), new byte[0]);
    }

    private record SparPdf(String url, byte[] bytes) {
    }

    private static boolean keepCatalog(ParsedCatalog catalog, LocalDate today) {
        return FlyerCatalogParser.isCurrentOrUpcoming(
                catalog.paper().validFrom(), catalog.paper().validTo(), today);
    }

    private ParsedCatalog withPennyPageTexts(ParsedCatalog catalog, String indexHtml) {
        String base = trimUrl(catalog.paper().officialUrl());
        List<ParsedPage> pages = new ArrayList<>();
        List<ParsedProduct> products = new ArrayList<>();
        for (ParsedPage page : catalog.pages()) {
            String html = page.pageNumber() == 1
                    ? indexHtml
                    : safeText(base + parser.pennyPageRelPath(indexHtml, page.pageNumber()));
            String text = parser.extractPennyPageText(html);
            if (text.isBlank()) {
                text = page.text() == null ? "" : page.text();
            }
            pages.add(new ParsedPage(page.pageNumber(), page.imageUrl(), text));
            products.addAll(parser.extractPricedItems(text, page.pageNumber()));
        }
        if (products.isEmpty()) {
            products.addAll(catalog.products());
        }
        return new ParsedCatalog(catalog.paper(), pages, products);
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

    private ParsedCatalog withPdfPages(ParsedCatalog catalog) {
        List<ParsedPage> pages = pdfExtractor.extractPages(safeBytes(catalog.paper().pdfUrl()));
        return new ParsedCatalog(catalog.paper(), pages, catalog.products());
    }

    private String safeText(String url) {
        try {
            return httpClient.getText(url);
        } catch (Exception e) {
            log.debug("Flyer fetch failed for {}: {}", url, e.getMessage());
            return "";
        }
    }

    private String safePostJson(String url, String body) {
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
        if (url == null || url.isBlank()) {
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

    private static String joinNames(List<ParsedProduct> products) {
        StringBuilder text = new StringBuilder();
        for (ParsedProduct product : products) {
            if (!text.isEmpty()) {
                text.append(' ');
            }
            text.append(product.name());
            if (product.priceText() != null) {
                text.append(' ').append(product.priceText());
            }
        }
        return text.toString();
    }

    private static String trimUrl(String url) {
        return url.endsWith("/") ? url : url + "/";
    }
}

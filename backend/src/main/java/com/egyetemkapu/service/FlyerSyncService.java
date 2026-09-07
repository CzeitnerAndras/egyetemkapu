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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class FlyerSyncService {

    private static final Logger log = LoggerFactory.getLogger(FlyerSyncService.class);
    private static final List<String> STORES = List.of("aldi", "spar", "penny");

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
                catalogs.add(catalog);
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
                byte[] pdf = safeBytes(paper.pdfUrl());
                List<ParsedPage> pages = pdfExtractor.extractPages(pdf);
                catalogs.add(new ParsedCatalog(paper, pages, List.of()));
            }
            flyerPersistenceService.replaceStore("spar", catalogs, LocalDateTime.now(clock));
        } catch (Exception e) {
            log.warn("SPAR flyer sync failed: {}", e.getMessage());
        }
    }

    public void syncPenny(LocalDate today) {
        try {
            String html = httpClient.getText("https://www.penny.hu/ajanlatok");
            String reklam = safeText("https://www.penny.hu/reklamujsag");
            List<DiscoveredPaper> papers = parser.discoverPennyPapers(html + "\n" + reklam, today);
            List<ParsedCatalog> catalogs = new ArrayList<>();
            for (DiscoveredPaper paper : papers) {
                if (paper.officialUrl().contains("publitas") || paper.officialUrl().contains("szorolap")) {
                    String dataJson = safeText(trimUrl(paper.officialUrl()) + "data.json");
                    String spreadsJson = safeText(trimUrl(paper.officialUrl()) + "spreads.json");
                    catalogs.add(parser.parsePublitas(paper, dataJson, spreadsJson));
                } else {
                    List<ParsedProduct> products = parser.extractHtmlProducts(html + "\n" + reklam);
                    List<ParsedPage> pages = products.isEmpty()
                            ? List.of()
                            : List.of(new ParsedPage(1, null, joinNames(products)));
                    catalogs.add(new ParsedCatalog(paper, pages, products));
                }
            }
            flyerPersistenceService.replaceStore("penny", catalogs, LocalDateTime.now(clock));
        } catch (Exception e) {
            log.warn("PENNY flyer sync failed: {}", e.getMessage());
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
                .orElse(true);
    }

    public List<String> stores() {
        return STORES;
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

    private byte[] safeBytes(String url) {
        if (url == null || url.isBlank()) {
            return new byte[0];
        }
        try {
            return httpClient.getBytes(url);
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

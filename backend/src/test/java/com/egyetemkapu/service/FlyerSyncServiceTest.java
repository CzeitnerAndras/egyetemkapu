package com.egyetemkapu.service;

import com.egyetemkapu.model.Flyer;
import com.egyetemkapu.model.FlyerPage;
import com.egyetemkapu.model.FlyerProduct;
import com.egyetemkapu.repository.FlyerRepository;
import com.egyetemkapu.service.FlyerCatalogParser.TextRun;
import com.egyetemkapu.service.flyer.FlyerExtractorRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.intThat;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FlyerSyncServiceTest {

    @Mock private FlyerRepository flyerRepository;
    @Mock private FlyerPersistenceService flyerPersistenceService;
    @Mock private FlyerHttpClient httpClient;
    @Mock private FlyerPdfExtractor pdfExtractor;
    @Mock private FlyerSyncLog syncLog;

    private FlyerCatalogParser parser;
    private FlyerSyncService service;

    @BeforeEach
    void setUp() {
        parser = new FlyerCatalogParser();
        Clock clock = Clock.fixed(Instant.parse("2026-09-06T08:00:00Z"), ZoneId.of("Europe/Budapest"));
        service = new FlyerSyncService(
                flyerRepository,
                flyerPersistenceService,
                httpClient,
                parser,
                pdfExtractor,
                new FlyerExtractorRegistry(parser),
                image -> List.of(),
                clock,
                syncLog);
    }

    @Test
    void aSecondStoreRetryDoesNotStartAnotherSync() {
        assertTrue(service.reserveStoreRetry("aldi"));
        assertFalse(service.reserveStoreRetry("spar"));
    }

    @Test
    void unknownStoreRetryIsRejected() {
        assertThrows(IllegalArgumentException.class, () -> service.reserveStoreRetry("nincs"));
    }

    @Test
    void syncAldiPersistsPublitasCatalog() {
        when(httpClient.getText("https://www.aldi.hu/online-akcios-ujsag"))
                .thenReturn("<a href=\"https://szorolap.aldi.hu/aldi_online_akcios_ujsag_2026_kw36/\">x</a>");
        when(httpClient.getText("https://szorolap.aldi.hu/aldi_online_akcios_ujsag_2026_kw36/data.json"))
                .thenReturn("{\"config\":{\"publicationTitle\":\"ALDI KW36\"}}");
        when(httpClient.getText("https://szorolap.aldi.hu/aldi_online_akcios_ujsag_2026_kw36/spreads.json"))
                .thenReturn("{\"spreads\":[{\"pages\":[{\"number\":1,\"products\":[{\"title\":\"Kakaóscsiga\",\"price\":\"249\"}]}]}]}");

        service.syncAldi(LocalDate.of(2026, 9, 6));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<FlyerCatalogParser.ParsedCatalog>> captor = ArgumentCaptor.forClass(List.class);
        verify(flyerPersistenceService).replaceStore(eq("aldi"), captor.capture(), any());
        assertEquals("ALDI KW36", captor.getValue().getFirst().paper().title());
        assertEquals("Kakaóscsiga", captor.getValue().getFirst().products().getFirst().name());
        verify(syncLog).record(eq("aldi"), any(), any(), intThat(count -> count > 0), isNull());
    }

    // --- Sync log ---
    @Test
    void syncAldiRecordsAFailureAndKeepsTheStoredFlyer() {
        when(httpClient.getText(any())).thenThrow(new IllegalStateException("aldi down"));

        service.syncAldi(LocalDate.of(2026, 9, 6));

        verify(flyerPersistenceService, never()).replaceStore(eq("aldi"), any(), any());
        verify(syncLog).record(eq("aldi"), any(), any(), eq(0), eq("aldi down"));
    }

    @Test
    void syncAldiSkipsPublicationsWithNoPages() {
        when(httpClient.getText("https://www.aldi.hu/online-akcios-ujsag"))
                .thenReturn("<a href=\"https://szorolap.aldi.hu/aldi_kozepso_sor_2026_kw38/\">x</a>");
        when(httpClient.getText("https://szorolap.aldi.hu/aldi_kozepso_sor_2026_kw38/data.json"))
                .thenReturn("{\"config\":{\"publicationTitle\":\"ALDI KOZEPSO SOR 2026 KW38\"}}");
        when(httpClient.getText("https://szorolap.aldi.hu/aldi_kozepso_sor_2026_kw38/spreads.json"))
                .thenReturn("{\"spreads\":[]}");

        service.syncAldi(LocalDate.of(2026, 9, 12));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<FlyerCatalogParser.ParsedCatalog>> captor = ArgumentCaptor.forClass(List.class);
        verify(flyerPersistenceService).replaceStore(eq("aldi"), captor.capture(), any());
        assertTrue(captor.getValue().isEmpty());
    }

    @Test
    void syncSparPersistsFallbackPdfWhenPageHasNoLinks() {
        when(httpClient.getText("https://www.spar.hu/ajanlatok")).thenReturn("<html></html>");
        when(httpClient.getBytes(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> {
                    String url = invocation.getArgument(0);
                    return url.endsWith("/spar-szorolap-0903p.pdf") ? new byte[] { 1, 2, 3, 4 } : new byte[0];
                });
        when(pdfExtractor.extractDocument(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> {
                    byte[] pdf = invocation.getArgument(0);
                    if (pdf == null || pdf.length == 0) {
                        return new FlyerPdfExtractor.ExtractedDocument(List.of(), List.of());
                    }
                    return new FlyerPdfExtractor.ExtractedDocument(
                            List.of(new FlyerCatalogParser.ParsedPage(1, null, "Kakaós csiga 249 Ft")),
                            List.of(new FlyerCatalogParser.ParsedProduct("Kakaós csiga", 1, null)));
                });

        service.syncSpar(LocalDate.of(2026, 9, 6));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<FlyerCatalogParser.ParsedCatalog>> captor = ArgumentCaptor.forClass(List.class);
        verify(flyerPersistenceService).replaceStore(eq("spar"), captor.capture(), any());
        assertEquals(1, captor.getValue().size());
        assertEquals("Kakaós csiga", captor.getValue().getFirst().products().getFirst().name());
        assertTrue(captor.getValue().getFirst().paper().officialUrl().contains("/ajanlatok/spar/260903-1-spar-szorolap"));
        verify(httpClient, atLeastOnce()).getBytes(
                org.mockito.ArgumentMatchers.contains("spar-szorolap-0903p.pdf"),
                eq("https://www.spar.hu/ajanlatok"));
    }

    @Test
    void syncSparUsesWeeklyFallbackWhenListingIsBlocked() {
        when(httpClient.getText("https://www.spar.hu/ajanlatok"))
                .thenThrow(new RuntimeException("403 Forbidden"));
        when(httpClient.getBytes(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> {
                    String url = invocation.getArgument(0);
                    return url.endsWith("/spar-szorolap-0903p.pdf") ? new byte[] { 1, 2, 3, 4 } : new byte[0];
                });
        when(pdfExtractor.extractDocument(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> {
                    byte[] pdf = invocation.getArgument(0);
                    if (pdf == null || pdf.length == 0) {
                        return new FlyerPdfExtractor.ExtractedDocument(List.of(), List.of());
                    }
                    return new FlyerPdfExtractor.ExtractedDocument(
                            List.of(new FlyerCatalogParser.ParsedPage(1, null, "Kakaós csiga 249 Ft")),
                            List.of(new FlyerCatalogParser.ParsedProduct("Kakaós csiga", 1, null)));
                });

        service.syncSpar(LocalDate.of(2026, 9, 6));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<FlyerCatalogParser.ParsedCatalog>> captor = ArgumentCaptor.forClass(List.class);
        verify(flyerPersistenceService).replaceStore(eq("spar"), captor.capture(), any());
        assertEquals(1, captor.getValue().size());
        assertTrue(captor.getValue().getFirst().paper().officialUrl().contains("/ajanlatok/spar/260903-1-spar-szorolap"));
    }

    @Test
    void syncPennyPersistsReweFlippingBookPages() {
        String index = """
                <html><head><title>PENNY 36. heti rekl&#225;m&#250;js&#225;g</title></head>
                <body>
                <p>Made with FlippingBook FBInit placeholder text so the leaflet detector keeps this HTML.</p>
                <a class="internalLink" rel="next" href="./2/" title="oldal">2</a>
                <a class="internalLink" rel="last" href="./3/" title="utolso">3</a>
                <div id="text-container" itemprop="text">
                  <p>Kakaós csiga 249 Ft a cimen</p>
                </div>
                </body></html>
                """;
        String page2 = """
                <html><head><title>PENNY 36. heti rekl&#225;m&#250;js&#225;g - Page 2</title></head>
                <body>
                <p>Made with FlippingBook FBInit placeholder text so the leaflet detector keeps this HTML.</p>
                <div id="text-container" itemprop="text">
                  <p>Tej 199 Ft a masodik oldalon</p>
                </div>
                </body></html>
                """;
        when(httpClient.getText(org.mockito.ArgumentMatchers.anyString())).thenAnswer(invocation -> {
            String url = invocation.getArgument(0);
            if (url.contains("/PennyIntLeaflet/HU/202636/2/")) {
                return page2;
            }
            if (url.contains("/PennyIntLeaflet/HU/202636")) {
                return index;
            }
            return "<html></html>";
        });

        service.syncPenny(LocalDate.of(2026, 9, 6));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<FlyerCatalogParser.ParsedCatalog>> captor = ArgumentCaptor.forClass(List.class);
        verify(flyerPersistenceService).replaceStore(eq("penny"), captor.capture(), any());
        assertEquals(1, captor.getValue().size());
        FlyerCatalogParser.ParsedCatalog catalog = captor.getValue().getFirst();
        assertEquals("PENNY 36. heti reklámújság", catalog.paper().title());
        assertEquals(3, catalog.pages().size());
        assertTrue(catalog.pages().getFirst().imageUrl().contains("page0001_2.jpg"));
        assertTrue(catalog.products().stream().anyMatch(product -> product.name().contains("Kakaós")));
        assertTrue(catalog.products().stream().anyMatch(product -> product.pageNumber() == 2));
    }

    @Test
    void syncTescoPersistsHypermarketSupermarketAndCatalogue() {
        String json = """
                {"data":{"leaflets":{"items":[
                  {"id":689,"slug":"tesco-ujsag-2026-09-10","leafletUrl":"https://digitalcontent.api.tesco.com/v2/media/x/hm.pdf","validFrom":"2026-09-10T06:00:00.000Z","validTo":"2026-09-16T21:59:59.000Z","type":"HM","pages":[{"pagePNG":"https://digitalcontent.api.tesco.com/v2/media/x/HM.1.jpeg"}]},
                  {"id":690,"slug":"tesco-ujsag-2026-09-10","leafletUrl":"https://digitalcontent.api.tesco.com/v2/media/x/sm.pdf","validFrom":"2026-09-10T06:00:00.000Z","validTo":"2026-09-16T21:59:59.000Z","type":"SM","pages":[{"pagePNG":"https://digitalcontent.api.tesco.com/v2/media/x/SM.1.jpeg"}]},
                  {"id":652,"slug":"tesco-ujsag-2026-08-05","leafletUrl":"https://digitalcontent.api.tesco.com/v2/media/x/cat.pdf","validFrom":"2026-08-05T06:00:00.000Z","validTo":"2026-09-13T21:59:59.000Z","type":"CAT","pages":[{"pagePNG":"https://digitalcontent.api.tesco.com/v2/media/x/CAT.1.jpeg"}]}
                ]}}}
                """;
        when(httpClient.postJson(org.mockito.ArgumentMatchers.contains("leaflets-be/graphql"), any())).thenReturn(json);
        when(httpClient.getBytes(any(), any())).thenReturn(new byte[0]);

        service.syncTesco(LocalDate.of(2026, 9, 10));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<FlyerCatalogParser.ParsedCatalog>> captor = ArgumentCaptor.forClass(List.class);
        verify(flyerPersistenceService).replaceStore(eq("tesco"), captor.capture(), any());
        assertEquals(List.of("Tesco Hipermarket", "Tesco Szupermarket", "Tesco Katalógus"),
                captor.getValue().stream().map(catalog -> catalog.paper().title()).toList());
        assertTrue(                captor.getValue().getFirst().paper().officialUrl().contains("/hipermarket/tesco-ujsag-2026-09-10/1"));
    }

    // --- Recent Tesco ---
    @Test
    void syncTescoSkipsWhenRecentlySynced() {
        Flyer existing = new Flyer();
        existing.setStore("tesco");
        existing.setLastSynced(LocalDateTime.of(2026, 9, 6, 10, 0));
        when(flyerRepository.findAll()).thenReturn(List.of(existing));

        service.syncTesco(LocalDate.of(2026, 9, 6));

        verify(httpClient, never()).postJson(any(), any());
        verify(flyerPersistenceService, never()).replaceStore(eq("tesco"), any(), any());
        verify(syncLog, never()).record(any(), any(), any(), anyInt(), any());
    }

    @Test
    void refreshStoredLayoutReplacesWrongSparProductsFromPdf() {
        Flyer flyer = new Flyer();
        flyer.setId(9L);
        flyer.setStore("spar");
        flyer.setTitle("SPAR szórólap");
        flyer.setPdfUrl("https://www.spar.hu/content/dam/x.pdf");
        flyer.setSourceKey("spar:spar:2026-09-10");
        flyer.setValidFrom(LocalDate.of(2026, 9, 10));
        FlyerPage page = new FlyerPage();
        page.setPageNumber(1);
        page.setPageText("Madre pizza\n7499 Ft");
        flyer.addPage(page);
        FlyerProduct wrong = new FlyerProduct();
        wrong.setName("Őszibarack");
        wrong.setPageNumber(1);
        flyer.addProduct(wrong);
        when(httpClient.getBytes(eq("https://www.spar.hu/content/dam/x.pdf"), any())).thenReturn(new byte[] { 1, 2, 3 });
        when(pdfExtractor.extractDocument(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(new FlyerPdfExtractor.ExtractedDocument(
                        List.of(new FlyerCatalogParser.ParsedPage(1, null, "Madre pizza")),
                        List.of(new FlyerCatalogParser.ParsedProduct("Madre pizza", 1, null))));
        when(flyerRepository.save(flyer)).thenReturn(flyer);

        assertTrue(service.refreshStoredLayout(flyer));

        assertEquals(1, flyer.getProducts().size());
        assertEquals("Madre pizza", flyer.getProducts().getFirst().getName());
        assertEquals("Madre pizza", flyer.getPages().getFirst().getPageText());
        verify(flyerRepository).save(flyer);
    }

    @Test
    void refreshStoredLayoutReplacesMismatchedAldiBrandsFromPdf() {
        Flyer flyer = new Flyer();
        flyer.setId(4L);
        flyer.setStore("aldi");
        flyer.setTitle("ALDI Online akciós újság");
        flyer.setPdfUrl("https://view.publitas.com/96383/3368768/pdfs/aldi.pdf");
        flyer.setOfficialUrl("https://szorolap.aldi.hu/aldi_online_akcios_ujsag_2026_kw39/");
        FlyerPage page = new FlyerPage();
        page.setPageNumber(3);
        page.setPageText("MOSER ROTH\n\nMILSANI\n\nKAKAÓS TEJ\n\nTÖLTÖTT CSOKOLÁDÉ");
        flyer.addPage(page);
        FlyerProduct swapped = new FlyerProduct();
        swapped.setName("MOSER ROTH KAKAÓS TEJ");
        swapped.setPageNumber(3);
        flyer.addProduct(swapped);
        when(httpClient.getBytes(eq("https://view.publitas.com/96383/3368768/pdfs/aldi.pdf"), any()))
                .thenReturn(new byte[] { 1, 2, 3 });
        when(pdfExtractor.extractDocument(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(new FlyerPdfExtractor.ExtractedDocument(
                        List.of(new FlyerCatalogParser.ParsedPage(3, null, "layout")),
                        List.of(
                                new FlyerCatalogParser.ParsedProduct("MILSANI KAKAÓS TEJ", 3, null),
                                new FlyerCatalogParser.ParsedProduct("MOSER ROTH TÖLTÖTT CSOKOLÁDÉ", 3, null))));
        when(flyerRepository.save(flyer)).thenReturn(flyer);

        assertTrue(service.refreshStoredLayout(flyer));

        assertEquals(List.of("MILSANI KAKAÓS TEJ", "MOSER ROTH TÖLTÖTT CSOKOLÁDÉ"),
                flyer.getProducts().stream().map(FlyerProduct::getName).toList());
        verify(flyerRepository).save(flyer);
    }

    @Test
    void syncPennyDoesNotFetchPoisonedViewerUrls() {
        when(httpClient.getText(org.mockito.ArgumentMatchers.anyString())).thenReturn(
                "<a href=\"https://169.254.169.254/publitas/stolen\">x</a>"
                        + "<a href=\"https://evil.example/szorolap/stolen\">y</a>");

        service.syncPenny(LocalDate.of(2026, 9, 6));

        verify(httpClient, never()).getText(org.mockito.ArgumentMatchers.contains("169.254"));
        verify(httpClient, never()).getText(org.mockito.ArgumentMatchers.contains("evil.example"));
        verify(httpClient, never()).getBytes(org.mockito.ArgumentMatchers.contains("169.254"));
        verify(httpClient, never()).getBytes(org.mockito.ArgumentMatchers.contains("evil.example"), any());
    }

    @Test
    void syncAuchanPersistsIpaperPagesFromTheHomepage() {
        String listing = """
                <a href="https://reklamujsag.auchan.hu/online-katalogusok/2026/tr37/2026-09-10-09-16-heti-hipermarket-ajanlataink/">hiper</a>
                """;
        String catalog = """
                <script>window.staticSettings = {
                  "name":"2026-09-10-09-16-heti-hipermarket-ajanlataink",
                  "pages":[1],
                  "pageTexts":["CSIRKE ALSÓCOMB 785 Ft ÉDESBURGONYA 589 Ft"]
                };</script>
                """;
        when(httpClient.getText(org.mockito.ArgumentMatchers.anyString())).thenAnswer(invocation -> {
            String url = invocation.getArgument(0);
            if (url.contains("reklamujsag.auchan.hu") && url.contains("hipermarket")) {
                return catalog;
            }
            if (url.contains("auchan.hu")) {
                return listing;
            }
            return "";
        });

        service.syncAuchan(LocalDate.of(2026, 9, 15));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<FlyerCatalogParser.ParsedCatalog>> captor = ArgumentCaptor.forClass(List.class);
        verify(flyerPersistenceService).replaceStore(eq("auchan"), captor.capture(), any());
        FlyerCatalogParser.ParsedCatalog parsed = captor.getValue().getFirst();
        assertEquals(1, parsed.pages().size());
        assertTrue(parsed.products().stream().anyMatch(product -> product.name().toUpperCase().contains("CSIRKE")),
                parsed.products().toString());
        assertTrue(parsed.products().stream().noneMatch(product ->
                product.name() != null && product.name().contains("hivatalos oldalon")));
    }

    @Test
    void syncCoopPersistsTheCurrentRegionalLeaflet() {
        service = new FlyerSyncService(
                flyerRepository,
                flyerPersistenceService,
                httpClient,
                parser,
                pdfExtractor,
                new FlyerExtractorRegistry(parser),
                image -> List.of(new FlyerCatalogParser.TextRun(20, 80, 40, 16, "Pick"),
                        new FlyerCatalogParser.TextRun(64, 80, 70, 16, "párizsi"),
                        new FlyerCatalogParser.TextRun(20, 110, 40, 16, "289"),
                        new FlyerCatalogParser.TextRun(20, 130, 24, 16, "Ft")),
                Clock.fixed(Instant.parse("2026-09-06T08:00:00Z"), ZoneId.of("Europe/Budapest")),
                syncLog);
        when(httpClient.getText(org.mockito.ArgumentMatchers.anyString())).thenAnswer(invocation -> {
            String url = invocation.getArgument(0);
            if (url.contains("ajanlatkereso")) {
                return """
                        <div class="swiper-slide">
                            <a style="background-image: url('https://www.coop.hu/wp-content/uploads/2026/09/coop_mecsek_szorolap_20260924-0930.jpg');"></a>
                            <h3 class="title">Coop regionális szórólap szeptember 4. hét - Mecsek</h3>
                            <p>2026. szeptember 24. - 2026. szeptember 30.</p>
                        </div>
                        """;
            }
            if (url.endsWith("data.json")) {
                return "{\"config\":{\"publicationTitle\":\"Coop Mecsek\"}}";
            }
            if (url.endsWith("spreads.json")) {
                return """
                        {"spreads":[{"pages":[
                          {"number":1,"images":{"at1200":"https://katalogus.coop.hu/pages/1.jpg"}},
                          {"number":2,"images":{"at1200":"https://katalogus.coop.hu/pages/2.jpg"}}
                        ]}]}
                        """;
            }
            return "";
        });
        when(httpClient.getBytes(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(new byte[] {1, 2, 3});

        service.syncCoop(LocalDate.of(2026, 9, 28));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<FlyerCatalogParser.ParsedCatalog>> captor = ArgumentCaptor.forClass(List.class);
        verify(flyerPersistenceService).replaceStore(eq("coop"), captor.capture(), any());
        assertEquals("coop:coop-mecsek-szorolap-2026-szeptember-4-het", captor.getValue().getFirst().paper().sourceKey());
        assertEquals(2, captor.getValue().getFirst().pages().size());
        assertTrue(captor.getValue().getFirst().products().stream()
                .anyMatch(product -> product.name().toLowerCase().contains("párizsi")));
    }

    @Test
    void isStaleDoesNotRetriggerRightAfterASyncAttempt() {
        Flyer tesco = storeFlyer("tesco", "tesco:HM:2026-09-03", "https://www.tesco.hu/akciok");
        Flyer penny = storeFlyer("penny", "penny:rewe:202636",
                "https://files.rewe.co.at/PennyIntLeaflet/HU/202636/");
        Flyer spar = storeFlyer("spar", "spar:spar:2026-09-03",
                "https://www.spar.hu/ajanlatok/spar/260903-1-spar-szorolap");
        Flyer inter = storeFlyer("spar", "spar:interspar:2026-09-03",
                "https://www.spar.hu/ajanlatok/interspar/260903-2-interspar-szorolap");
        Flyer market = storeFlyer("spar", "spar:spar-market:2026-09-03",
                "https://www.spar.hu/ajanlatok/spar-market/260903-3-spar-market-city-spar");
        Flyer auchan = storeFlyer("auchan", "auchan:2026-09-03-09-09-heti-hipermarket-ajanlataink",
                "https://reklamujsag.auchan.hu/online-katalogusok/2026/tr36/x/");
        Flyer coop = storeFlyer("coop", "coop:nyirzem:2026-09-03", "https://katalogus.coop.hu/coop-nyirzem/");
        coop.addPage(new FlyerPage());
        coop.addPage(new FlyerPage());
        FlyerProduct sonka = new FlyerProduct();
        sonka.setName("Pápai extra sonka");
        sonka.setPageNumber(1);
        coop.addProduct(sonka);
        Flyer lidl = storeFlyer("lidl", "lidl:01a0fcf6-ff2f-7a6f-8cb3-4f8efa06be61",
                "https://www.lidl.hu/l/hu/ujsag/akcios-ujsag-41-het-2026/ar/0");
        Flyer rossmann = storeFlyer("rossmann", "rossmann:333",
                "https://shop.rossmann.hu/magazin/altalanos/333");
        Flyer dm = storeFlyer("dm", "dm:expressz_2026-10-15",
                "https://magazin.dm.hu/expressz_2026-10-15/");
        Flyer metro = storeFlyer("metro", "metro:mm2610_brands",
                "https://katalogus.metro.hu/mm2610_brands/");
        Flyer real = storeFlyer("real", "real:kisalfold-oktober-28-31-01",
                "https://real.hu/wp-content/uploads/2026/10/Kisalfold-oktober-28-31.-01.pdf");
        Flyer cba = storeFlyer("cba", "cba:kiemelt:2026-10-05", "https://www.cba.hu/");
        when(flyerRepository.findAll()).thenReturn(List.of(
                tesco, penny, spar, inter, market, auchan, coop, lidl, rossmann, dm, metro, real, cba));
        lenient().when(flyerRepository.findProductNamesByStore(any())).thenReturn(List.of());
        lenient().when(httpClient.getText(any())).thenReturn("");
        lenient().when(httpClient.getBytes(any())).thenReturn(new byte[0]);
        lenient().when(httpClient.getBytes(any(), any())).thenReturn(new byte[0]);
        lenient().when(httpClient.postJson(any(), any())).thenReturn("");

        LocalDateTime now = LocalDateTime.of(2026, 9, 6, 10, 0);
        assertFalse(service.isStale(now));
    }

    @Test
    void repairSplitCoopProductsJoinsWordsFromThePageImage() {
        Clock clock = Clock.fixed(Instant.parse("2026-09-06T08:00:00Z"), ZoneId.of("Europe/Budapest"));
        FlyerSyncService rejoining = new FlyerSyncService(
                flyerRepository,
                flyerPersistenceService,
                httpClient,
                parser,
                pdfExtractor,
                new FlyerExtractorRegistry(parser),
                image -> List.of(
                        new TextRun(20, 120, 40, 16, "Anni"),
                        new TextRun(66, 120, 50, 16, "Panni"),
                        new TextRun(300, 120, 36, 16, "Red"),
                        new TextRun(342, 120, 40, 16, "Bull")),
                clock,
                syncLog);
        Flyer coop = storeFlyer("coop", "coop:alfold", "https://katalogus.coop.hu/coop-alfold/");
        coop.setId(7L);
        FlyerPage page = new FlyerPage();
        page.setPageNumber(1);
        page.setImageUrl("https://katalogus.coop.hu/page.jpg");
        coop.addPage(page);
        for (String name : List.of("Anni", "Bull", "Comer", "Csirke", "Csont", "energiaital", "Panni", "bed")) {
            FlyerProduct product = new FlyerProduct();
            product.setName(name);
            product.setPageNumber(1);
            coop.addProduct(product);
        }
        when(httpClient.getBytes("https://katalogus.coop.hu/page.jpg", "https://katalogus.coop.hu/coop-alfold/"))
                .thenReturn(new byte[] {1, 2, 3});
        when(flyerRepository.save(coop)).thenReturn(coop);

        assertTrue(rejoining.repairSplitCoopProducts(coop));

        List<String> names = coop.getProducts().stream().map(FlyerProduct::getName).toList();
        assertTrue(names.contains("Anni Panni"));
        assertTrue(names.contains("Red Bull"));
        assertFalse(names.contains("Anni"));
        assertFalse(names.contains("Panni"));
    }

    @Test
    void beginCoopRereadWhenASavedNameStillHasTheFatLabelOrAFootnote() {
        Flyer coop = storeFlyer("coop", "coop:alfold", "https://katalogus.coop.hu/coop-alfold/");
        coop.setId(7L);
        for (String name : List.of("Anni Panni Félzsíros", "Csirke mellfilé", "\"többet\" feküntetett")) {
            FlyerProduct product = new FlyerProduct();
            product.setName(name);
            product.setPageNumber(1);
            coop.addProduct(product);
        }

        assertTrue(service.beginCoopReread(coop));
    }

    @Test
    void isStaleWhenCoopProductNamesAreSingleWords() {
        Flyer tesco = storeFlyer("tesco", "tesco:HM:2026-09-03", "https://www.tesco.hu/akciok");
        Flyer penny = storeFlyer("penny", "penny:rewe:202636",
                "https://files.rewe.co.at/PennyIntLeaflet/HU/202636/");
        Flyer spar = storeFlyer("spar", "spar:spar:2026-09-03",
                "https://www.spar.hu/ajanlatok/spar/260903-1-spar-szorolap");
        Flyer inter = storeFlyer("spar", "spar:interspar:2026-09-03",
                "https://www.spar.hu/ajanlatok/interspar/260903-2-interspar-szorolap");
        Flyer market = storeFlyer("spar", "spar:spar-market:2026-09-03",
                "https://www.spar.hu/ajanlatok/spar-market/260903-3-spar-market-city-spar");
        Flyer auchan = storeFlyer("auchan", "auchan:2026-09-03-09-09-heti-hipermarket-ajanlataink",
                "https://reklamujsag.auchan.hu/online-katalogusok/2026/tr36/x/");
        Flyer coop = storeFlyer("coop", "coop:alfold", "https://katalogus.coop.hu/coop-alfold/");
        coop.addPage(new FlyerPage());
        coop.addPage(new FlyerPage());
        for (String name : List.of("Anni", "Bull", "Comer", "Csirke", "Csont", "energiaital", "Panni", "bed")) {
            FlyerProduct product = new FlyerProduct();
            product.setName(name);
            product.setPageNumber(1);
            coop.addProduct(product);
        }
        when(flyerRepository.findAll()).thenReturn(List.of(tesco, penny, spar, inter, market, auchan, coop));

        assertTrue(service.isStale(LocalDateTime.of(2026, 9, 6, 10, 0)));
    }

    @Test
    void syncCoopReadsNamesFromThePublitasTextWhenThePageHasNoOcr() {
        when(httpClient.getText(org.mockito.ArgumentMatchers.anyString())).thenAnswer(invocation -> {
            String url = invocation.getArgument(0);
            if (url.contains("ajanlatkereso")) {
                return """
                        <div class="swiper-slide">
                            <a style="background-image: url('https://www.coop.hu/wp-content/uploads/2026/09/coop_alfold_szorolap_20260903-0909.jpg');"></a>
                            <h3 class="title">Coop regionális szórólap szeptember 2. hét - Alföld</h3>
                            <p>2026. szeptember 3. - 2026. szeptember 9.</p>
                        </div>
                        """;
            }
            if (url.endsWith("data.json")) {
                return "{\"config\":{\"publicationTitle\":\"Coop Alföld\"}}";
            }
            if (url.endsWith("spreads.json")) {
                return """
                        {"spreads":[{"pages":[
                          {"number":1,"images":{"at1200":"https://katalogus.coop.hu/pages/1.jpg"},
                           "text":"Pápai extra sonka\\n399 Ft\\nPepsi\\n2 l, 385 Ft/l"}
                        ]}]}
                        """;
            }
            return "";
        });

        service.syncCoop(LocalDate.of(2026, 9, 6));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<FlyerCatalogParser.ParsedCatalog>> captor = ArgumentCaptor.forClass(List.class);
        verify(flyerPersistenceService).replaceStore(eq("coop"), captor.capture(), any());
        List<String> names = captor.getValue().getFirst().products().stream()
                .map(FlyerCatalogParser.ParsedProduct::name)
                .toList();
        assertTrue(names.contains("Pápai extra sonka"), names.toString());
        assertTrue(names.contains("Pepsi"), names.toString());
        verify(httpClient, never()).getBytes(any(), any());
    }

    @Test
    void isStaleWhenCoopPagesHaveNoProducts() {
        Flyer tesco = storeFlyer("tesco", "tesco:HM:2026-09-03", "https://www.tesco.hu/akciok");
        Flyer penny = storeFlyer("penny", "penny:rewe:202636",
                "https://files.rewe.co.at/PennyIntLeaflet/HU/202636/");
        Flyer spar = storeFlyer("spar", "spar:spar:2026-09-03",
                "https://www.spar.hu/ajanlatok/spar/260903-1-spar-szorolap");
        Flyer inter = storeFlyer("spar", "spar:interspar:2026-09-03",
                "https://www.spar.hu/ajanlatok/interspar/260903-2-interspar-szorolap");
        Flyer market = storeFlyer("spar", "spar:spar-market:2026-09-03",
                "https://www.spar.hu/ajanlatok/spar-market/260903-3-spar-market-city-spar");
        Flyer auchan = storeFlyer("auchan", "auchan:2026-09-03-09-09-heti-hipermarket-ajanlataink",
                "https://reklamujsag.auchan.hu/online-katalogusok/2026/tr36/x/");
        Flyer coop = storeFlyer("coop", "coop:alfold", "https://katalogus.coop.hu/coop-alfold/");
        coop.addPage(new FlyerPage());
        coop.addPage(new FlyerPage());
        when(flyerRepository.findAll()).thenReturn(List.of(tesco, penny, spar, inter, market, auchan, coop));

        assertTrue(service.isStale(LocalDateTime.of(2026, 9, 6, 10, 0)));
    }

    @Test
    void isStaleWhenCurrentWeeklySparIsMissingEvenRightAfterASync() {
        Flyer tesco = storeFlyer("tesco", "tesco:HM:2026-09-03", "https://www.tesco.hu/akciok");
        Flyer penny = storeFlyer("penny", "penny:rewe:202636",
                "https://files.rewe.co.at/PennyIntLeaflet/HU/202636/");
        Flyer nextWeek = storeFlyer("spar", "spar:spar:2026-09-10",
                "https://www.spar.hu/ajanlatok/spar/260910-1-spar-szorolap");
        when(flyerRepository.findAll()).thenReturn(List.of(tesco, penny, nextWeek));
        lenient().when(httpClient.getText(any())).thenReturn("");
        lenient().when(httpClient.getBytes(any())).thenReturn(new byte[0]);
        lenient().when(httpClient.getBytes(any(), any())).thenReturn(new byte[0]);
        lenient().when(httpClient.postJson(any(), any())).thenReturn("");

        LocalDateTime now = LocalDateTime.of(2026, 9, 6, 10, 0);
        assertTrue(service.isStale(now));
        service.syncAll();
        assertTrue(service.isStale(now));
    }

    @Test
    void syncLidlPersistsTheNationalLeafletAndSkipsRegionalOnes() {
        String id = "01a0fcf6-ff2f-7a6f-8cb3-4f8efa06be61";
        when(httpClient.getText("https://www.lidl.hu/c/szorolap/s10013623")).thenReturn("""
                <a href="https://www.lidl.hu/l/hu/ujsag/akcios-ujsag-41-het-2026/ar/0?lf=HHZ"
                   id="flyer-%s">
                    <span class="flyer__title">Akciós újság – 41. hét</span>
                </a>
                <a href="https://www.lidl.hu/l/hu/ujsag/regionalis-akciok-debrecen-42het/ar/0?lf=HHZ"
                   id="flyer-01a120bd-0f8e-7317-95ed-0165b776d176">
                    <span class="flyer__title">Regionális akciók – Debrecen</span>
                </a>
                """.formatted(id));
        when(httpClient.getText("https://endpoints.leaflets.schwarz/v4/flyer?flyer_identifier=" + id)).thenReturn("""
                {"flyer":{
                  "title":"Akciós újság – 41. hét",
                  "pdfUrl":"https://assets.leaflets.schwarz/leaflets/pdfs/x.pdf",
                  "flyerUrlAbsolute":"https://www.lidl.hu/l/hu/ujsag/akcios-ujsag-41-het-2026/ar/0?lf=HHZ",
                  "offerStartDate":"2026-10-08",
                  "offerEndDate":"2026-10-14",
                  "pages":[{"number":1,"image":"https://imgproxy.leaflets.schwarz/cover.jpg","keyWords":"Milbona Joghurt"}]
                }}
                """);

        service.syncLidl(LocalDate.of(2026, 10, 10));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<FlyerCatalogParser.ParsedCatalog>> captor = ArgumentCaptor.forClass(List.class);
        verify(flyerPersistenceService).replaceStore(eq("lidl"), captor.capture(), any());
        assertEquals(1, captor.getValue().size());
        FlyerCatalogParser.ParsedCatalog catalog = captor.getValue().getFirst();
        assertEquals("Akciós újság – 41. hét", catalog.paper().title());
        assertEquals(LocalDate.of(2026, 10, 8), catalog.paper().validFrom());
        assertEquals(LocalDate.of(2026, 10, 14), catalog.paper().validTo());
        assertEquals("https://imgproxy.leaflets.schwarz/cover.jpg", catalog.pages().getFirst().imageUrl());
        assertTrue(catalog.pages().getFirst().text().contains("Milbona"));
        verify(httpClient, never()).getText(
                "https://endpoints.leaflets.schwarz/v4/flyer?flyer_identifier=01a120bd-0f8e-7317-95ed-0165b776d176");
    }

    @Test
    void syncRossmannPersistsCurrentMagazinesAndSkipsExpiredOnes() {
        when(httpClient.getText("https://magazin.microservices.rossmann.hu/api/magazines")).thenReturn("""
                [
                  {"id":333,"category_slug":"altalanos"},
                  {"id":329,"category_slug":"joker"}
                ]
                """);
        when(httpClient.getText("https://magazin.microservices.rossmann.hu/storage/json/altalanos/333.json"))
                .thenReturn("""
                        {
                          "valid_from":"2026-10-12",
                          "valid_to":"2026-10-18",
                          "pages":{"1":[{"zoom":3,"page":1,"filePath":"https://assets.microservices.rossmann.hu/magazin-prod/333/333-1-3.webp"}]},
                          "pois":{"1":[{"page":1,"product":{"name":"Winston állateledel macskáknak - 100 g"}}]}
                        }
                        """);
        when(httpClient.getText("https://magazin.microservices.rossmann.hu/storage/json/joker/329.json"))
                .thenReturn("""
                        {
                          "valid_from":"2026-09-01",
                          "valid_to":"2026-09-07",
                          "pages":{"1":[{"zoom":1,"page":1,"filePath":"https://assets.microservices.rossmann.hu/magazin-prod/329/329-1-1.webp"}]}
                        }
                        """);

        service.syncRossmann(LocalDate.of(2026, 10, 13));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<FlyerCatalogParser.ParsedCatalog>> captor = ArgumentCaptor.forClass(List.class);
        verify(flyerPersistenceService).replaceStore(eq("rossmann"), captor.capture(), any());
        assertEquals(1, captor.getValue().size());
        FlyerCatalogParser.ParsedCatalog catalog = captor.getValue().getFirst();
        assertEquals("Rossmann magazin", catalog.paper().title());
        assertEquals("rossmann:333", catalog.paper().sourceKey());
        assertEquals(LocalDate.of(2026, 10, 12), catalog.paper().validFrom());
        assertEquals("Winston állateledel macskáknak - 100 g", catalog.products().getFirst().name());
        verify(pdfExtractor, never()).extractDocument(any(), any());
        verify(pdfExtractor, never()).extractDocument(any(), any(), org.mockito.ArgumentMatchers.anyInt());
        verify(pdfExtractor, never()).extractLayout(any());
    }

    @Test
    void syncRossmannListsTheNamePrintedOnThePageInsteadOfTheLinkedShopProduct() {
        when(httpClient.getText("https://magazin.microservices.rossmann.hu/api/magazines")).thenReturn("""
                [{"id":335,"category_slug":"altalanos"}]
                """);
        when(httpClient.getText("https://magazin.microservices.rossmann.hu/storage/json/altalanos/335.json"))
                .thenReturn("""
                        {
                          "valid_from":"2026-10-19",
                          "valid_to":"2026-10-30",
                          "pdf":"https://storage.googleapis.com/magazin-prod/335/axufSVtpyTJBz1d1Urf3oipCmMVrPikiJHzVrJ8s.pdf",
                          "pages":{"2":[{"zoom":3,"page":2,"filePath":"https://assets.microservices.rossmann.hu/magazin-prod/335/335-2-3.webp"}]},
                          "pois":{"2":[{"page":2,"product":{"name":"Garnier Hyaluron+ textilmaszk hialuronsavval - 28 g"}}]}
                        }
                        """);
        when(httpClient.getBytes(
                eq("https://storage.googleapis.com/magazin-prod/335/axufSVtpyTJBz1d1Urf3oipCmMVrPikiJHzVrJ8s.pdf"),
                eq("https://shop.rossmann.hu/magazin")))
                .thenReturn(new byte[] {'%', 'P', 'D', 'F', '-', '1', '.', '4'});
        when(pdfExtractor.extractLayout(any())).thenReturn(java.util.Map.of(2, List.of(
                new TextRun(330, 312, 30, 7, "GARNIER", "ROSSMANNSans-Black", 7),
                new TextRun(330, 319, 35, 7, "HYALURON", "ROSSMANNSans-Black", 7),
                new TextRun(364, 319, 3, 7, "+", "ROSSMANNSans-Black", 7),
                new TextRun(330, 327, 53, 7, "BARRIER REPAIR", "ROSSMANNSans-Black", 7),
                new TextRun(330, 334, 46, 7, "FÁTYOLMASZK", "ROSSMANNSans-Black", 7),
                new TextRun(394, 353, 32, 19, "839", "ROSSMANNSans-Black", 19))));

        service.syncRossmann(LocalDate.of(2026, 10, 23));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<FlyerCatalogParser.ParsedCatalog>> captor = ArgumentCaptor.forClass(List.class);
        verify(flyerPersistenceService).replaceStore(eq("rossmann"), captor.capture(), any());
        List<String> names = captor.getValue().getFirst().products().stream()
                .map(FlyerCatalogParser.ParsedProduct::name)
                .toList();
        assertEquals(List.of("GARNIER HYALURON+ BARRIER REPAIR FÁTYOLMASZK"), names);
    }

    @Test
    void syncRossmannLeavesStoredFlyersAloneWhenTheListIsMissing() {
        when(httpClient.getText("https://magazin.microservices.rossmann.hu/api/magazines")).thenReturn("");

        service.syncRossmann(LocalDate.of(2026, 10, 13));

        verify(flyerPersistenceService, never()).replaceStore(eq("rossmann"), any(), any());
    }

    @Test
    void syncDmPersistsTheExpresszIssueAndKeepsThePrintedBrand() {
        when(httpClient.getText("https://content.services.dmtech.com/rootpage-dm-shop-hu-hu/magazin-1616174"))
                .thenReturn("""
                        {"linkTarget":"https://magazin.dm.hu/expressz_2026-10-15","text":"Magazin érvényessége: október 15 - október 28."}
                        """);
        when(httpClient.getText("https://magazin.dm.hu/expressz_2026-10-15/data.json")).thenReturn("""
                {"config":{"publicationTitle":"dmHU - dm_magazin_expressz_2026-10-15"}}
                """);
        when(httpClient.getText("https://magazin.dm.hu/expressz_2026-10-15/spreads.json")).thenReturn("""
                [{"pages":[{"number":1,"images":{"at1200":"/resize/cover.jpg"},"text":"GARNIER\\nmicellás víz\\nérzékeny bőrre\\n700 ml"}]}]
                """);
        when(httpClient.getText("https://magazin.dm.hu/expressz_2026-10-15/page/1/hotspots_data.json")).thenReturn("""
                [{"type":"product","products":[{"title":"Micellás víz, érzékeny bőrre"}]}]
                """);

        service.syncDm(LocalDate.of(2026, 10, 16));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<FlyerCatalogParser.ParsedCatalog>> captor = ArgumentCaptor.forClass(List.class);
        verify(flyerPersistenceService).replaceStore(eq("dm"), captor.capture(), any());
        FlyerCatalogParser.ParsedCatalog catalog = captor.getValue().getFirst();
        assertEquals("dm expressz", catalog.paper().title());
        assertEquals("dm:expressz_2026-10-15", catalog.paper().sourceKey());
        assertEquals(LocalDate.of(2026, 10, 15), catalog.paper().validFrom());
        assertEquals(LocalDate.of(2026, 10, 28), catalog.paper().validTo());
        assertEquals("https://magazin.dm.hu/resize/cover.jpg", catalog.pages().getFirst().imageUrl());
        assertEquals("GARNIER Micellás víz, érzékeny bőrre", catalog.products().getFirst().name());
        verify(pdfExtractor, never()).extractDocument(any(), any());
        verify(pdfExtractor, never()).extractDocument(any(), any(), org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    void syncDmLeavesStoredFlyersAloneWhenThePageIsMissing() {
        when(httpClient.getText("https://content.services.dmtech.com/rootpage-dm-shop-hu-hu/magazin-1616174"))
                .thenReturn("");

        service.syncDm(LocalDate.of(2026, 10, 16));

        verify(flyerPersistenceService, never()).replaceStore(eq("dm"), any(), any());
    }

    @Test
    void syncMetroPersistsTheCurrentCatalogAndSkipsTheExpiredOne() {
        String feed = "https://components.me-catalogues.metronom.com/api/catalog-filter"
                + "?resolution=600&feeds=metro-nagykereskedelem&collection_id=6365"
                + "&metatags%5B%5D=channel=website";
        when(httpClient.getText(feed)).thenReturn("""
                {"items":[
                  {"slug":"regi-katalogus","name":"Régi katalógus","validFrom":"2026-09-01","validTo":"2026-09-15"},
                  {"slug":"mm2610_brands","name":"Márkák katalógus 2026/10","validFrom":"2026-10-16","validTo":"2026-10-31"}
                ]}
                """);
        when(httpClient.getText("https://katalogus.metro.hu/mm2610_brands/data.json")).thenReturn("""
                {"config":{"publicationTitle":"Márkák katalógus 2026/10","downloadPdfUrl":"https://view.publitas.com/445/3454860/pdfs/markak.pdf"}}
                """);
        when(httpClient.getText("https://katalogus.metro.hu/mm2610_brands/spreads.json")).thenReturn("""
                [{"pages":[{"number":1,"images":{"at1200":"/resize/cover.jpg"},"text":"DANONE\\nDANETTE PUDING\\n839,-"}]}]
                """);

        service.syncMetro(LocalDate.of(2026, 10, 29));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<FlyerCatalogParser.ParsedCatalog>> captor = ArgumentCaptor.forClass(List.class);
        verify(flyerPersistenceService).replaceStore(eq("metro"), captor.capture(), any());
        FlyerCatalogParser.ParsedCatalog catalog = captor.getValue().getFirst();
        assertEquals("Márkák katalógus 2026/10", catalog.paper().title());
        assertEquals("metro:mm2610_brands", catalog.paper().sourceKey());
        assertEquals(LocalDate.of(2026, 10, 16), catalog.paper().validFrom());
        assertEquals(LocalDate.of(2026, 10, 31), catalog.paper().validTo());
        assertEquals("https://katalogus.metro.hu/resize/cover.jpg", catalog.pages().getFirst().imageUrl());
        assertEquals("DANONE DANETTE PUDING", catalog.products().getFirst().name());
        verify(httpClient, never()).getText("https://katalogus.metro.hu/regi-katalogus/data.json");
    }

    @Test
    void syncMetroLeavesStoredFlyersAloneWhenTheFeedIsMissing() {
        when(httpClient.getText(any())).thenReturn("");

        service.syncMetro(LocalDate.of(2026, 10, 29));

        verify(flyerPersistenceService, never()).replaceStore(eq("metro"), any(), any());
    }

    @Test
    void syncRealPersistsTheWeekendPdfsAndSkipsTheExpiredOne() {
        String page = "https://real.hu/aktualis-ajanlataink/";
        String alfi = "https://real.hu/wp-content/uploads/2026/10/JAV4-Alfi-oktober-28-31.-01.pdf";
        String kisalfold = "https://real.hu/wp-content/uploads/2026/10/Kisalfold-oktober-28-31.-01.pdf";
        when(httpClient.getText(page)).thenReturn("""
                <h3>Bevásárló hétvége - Pest megye</h3>
                <a href="%s" download="" class="promotion-pdf-download">Letöltöm</a>
                <h3>Bevásárló hétvége - Kisalföld</h3>
                <a href="%s" download="" class="promotion-pdf-download">Letöltöm</a>
                <h3>Régi hétvége</h3>
                <a href="https://real.hu/wp-content/uploads/2026/09/regi-oktober-01-04.pdf" download="" class="promotion-pdf-download">Letöltöm</a>
                """.formatted(alfi, kisalfold));
        when(httpClient.getBytes(eq(alfi), eq(page))).thenReturn(new byte[] {1, 2, 3});
        when(httpClient.getBytes(eq(kisalfold), eq(page))).thenReturn(new byte[] {4, 5, 6});
        when(pdfExtractor.extractDocument(any(), any(), eq(16))).thenReturn(
                new FlyerPdfExtractor.ExtractedDocument(
                        List.of(new FlyerCatalogParser.ParsedPage(1, null, "")),
                        List.of(new FlyerCatalogParser.ParsedProduct("Pilos tej", 1, null))));

        service.syncReal(LocalDate.of(2026, 10, 29));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<FlyerCatalogParser.ParsedCatalog>> captor = ArgumentCaptor.forClass(List.class);
        verify(flyerPersistenceService).replaceStore(eq("real"), captor.capture(), any());
        assertEquals(
                List.of("real:jav4-alfi-oktober-28-31-01", "real:kisalfold-oktober-28-31-01"),
                captor.getValue().stream().map(catalog -> catalog.paper().sourceKey()).toList());
        assertEquals("Bevásárló hétvége - Pest megye", captor.getValue().getFirst().paper().title());
        assertEquals("Pilos tej", captor.getValue().getFirst().products().getFirst().name());
        verify(httpClient, never()).getBytes(
                eq("https://real.hu/wp-content/uploads/2026/09/regi-oktober-01-04.pdf"), any());
    }

    @Test
    void syncRealLeavesStoredFlyersAloneWhenThePageIsMissing() {
        when(httpClient.getText("https://real.hu/aktualis-ajanlataink/")).thenReturn("");

        service.syncReal(LocalDate.of(2026, 10, 29));

        verify(flyerPersistenceService, never()).replaceStore(eq("real"), any(), any());
    }

    @Test
    void syncCbaPersistsFeaturedProductsAndTheCurrentPoster() {
        String poster = "https://www.cba.hu/wp-content/uploads/2026/10/CBA-Prima_OP_oktober_Piros.jpg";
        when(httpClient.getText("https://www.cba.hu/aktualis-ajanlataink/")).thenReturn("""
                <a href="%s" data-elementor-lightbox-title="CBA-Prima_OP_oktober_Piros"></a>
                <img src="https://www.cba.hu/wp-content/uploads/2026/09/CBA-Prima_OP_szeptember_Regi.jpg">
                """.formatted(poster));
        when(httpClient.getText("https://www.cba.hu/")).thenReturn("""
                <h3>Érvényes: 2026.10.05- 10.31.</h3>
                <img src="https://www.cba.hu/wp-content/uploads/2026/10/CBA-Piros-gepsonka.png">
                <h2 class="woocommerce-loop-product__title">CBA PIROS GÉPSONKA</h2>
                """);
        when(httpClient.getBytes(eq(poster), eq("https://www.cba.hu/aktualis-ajanlataink/")))
                .thenReturn(new byte[] {1, 2, 3});

        service.syncCba(LocalDate.of(2026, 10, 29));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<FlyerCatalogParser.ParsedCatalog>> captor = ArgumentCaptor.forClass(List.class);
        verify(flyerPersistenceService).replaceStore(eq("cba"), captor.capture(), any());
        assertEquals(
                List.of("cba:kiemelt:2026-10-05", "cba:cba-prima-op-oktober-piros"),
                captor.getValue().stream().map(catalog -> catalog.paper().sourceKey()).toList());
        assertEquals("CBA PIROS GÉPSONKA", captor.getValue().getFirst().products().getFirst().name());
        assertEquals(poster, captor.getValue().get(1).pages().getFirst().imageUrl());
        verify(httpClient, never()).getBytes(
                eq("https://www.cba.hu/wp-content/uploads/2026/09/CBA-Prima_OP_szeptember_Regi.jpg"), any());
    }

    private static Flyer storeFlyer(String store, String sourceKey, String url) {
        Flyer flyer = new Flyer();
        flyer.setStore(store);
        flyer.setSourceKey(sourceKey);
        flyer.setOfficialUrl(url);
        flyer.setLastSynced(LocalDateTime.of(2026, 9, 6, 9, 0));
        return flyer;
    }
}

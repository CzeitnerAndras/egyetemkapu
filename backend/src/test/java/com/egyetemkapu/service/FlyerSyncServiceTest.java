package com.egyetemkapu.service;

import com.egyetemkapu.model.Flyer;
import com.egyetemkapu.model.FlyerPage;
import com.egyetemkapu.model.FlyerProduct;
import com.egyetemkapu.repository.FlyerRepository;
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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FlyerSyncServiceTest {

    @Mock private FlyerRepository flyerRepository;
    @Mock private FlyerPersistenceService flyerPersistenceService;
    @Mock private FlyerHttpClient httpClient;
    @Mock private FlyerPdfExtractor pdfExtractor;

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
                clock);
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
    }

    @Test
    void syncSparPersistsFallbackPdfWhenPageHasNoLinks() {
        when(httpClient.getText("https://www.spar.hu/ajanlatok")).thenReturn("<html></html>");
        when(httpClient.getBytes(org.mockito.ArgumentMatchers.anyString())).thenAnswer(invocation -> {
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
        assertTrue(captor.getValue().getFirst().paper().officialUrl().contains("/hipermarket/tesco-ujsag-2026-09-10/1"));
    }

    @Test
    void syncTescoSkipsWhenRecentlySynced() {
        Flyer existing = new Flyer();
        existing.setStore("tesco");
        existing.setLastSynced(LocalDateTime.of(2026, 9, 6, 10, 0));
        when(flyerRepository.findAll()).thenReturn(List.of(existing));

        service.syncTesco(LocalDate.of(2026, 9, 6));

        verify(httpClient, never()).postJson(any(), any());
        verify(flyerPersistenceService, never()).replaceStore(eq("tesco"), any(), any());
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
        when(httpClient.getBytes("https://www.spar.hu/content/dam/x.pdf")).thenReturn(new byte[] { 1, 2, 3 });
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
}

package com.egyetemkapu.service;

import com.egyetemkapu.repository.FlyerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
        service = new FlyerSyncService(flyerRepository, flyerPersistenceService, httpClient, parser, pdfExtractor, clock);
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
        when(pdfExtractor.extractPages(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> {
                    byte[] pdf = invocation.getArgument(0);
                    if (pdf == null || pdf.length == 0) {
                        return List.of();
                    }
                    return List.of(new FlyerCatalogParser.ParsedPage(1, null, "Kakaós csiga 249 Ft"));
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
}

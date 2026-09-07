package com.egyetemkapu.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FlyerCatalogParserTest {

    private final FlyerCatalogParser parser = new FlyerCatalogParser();
    private final LocalDate today = LocalDate.of(2026, 9, 6);

    @Test
    void discoversAldiViewerLinks() {
        String html = "<a href=\"https://szorolap.aldi.hu/aldi_online_akcios_ujsag_2026_kw36/\">újság</a>";
        List<FlyerCatalogParser.DiscoveredPaper> papers = parser.discoverAldiPublications(html, today);
        assertEquals(1, papers.size());
        assertEquals("aldi:aldi_online_akcios_ujsag_2026_kw36", papers.getFirst().sourceKey());
        assertTrue(papers.getFirst().officialUrl().contains("szorolap.aldi.hu"));
    }

    @Test
    void fallsBackToCurrentIsoWeekWhenAldiHtmlHasNoLinks() {
        List<FlyerCatalogParser.DiscoveredPaper> papers = parser.discoverAldiPublications("<html></html>", today);
        assertFalse(papers.isEmpty());
        assertTrue(papers.getFirst().sourceKey().contains("kw"));
    }

    @Test
    void discoversSparPdfsAndSkipsStoreOpenings() {
        String html = """
                <a href="https://www.spar.hu/content/dam/sparhuwebsite/_flyers/2026/0903/spar-szorolap-0903p.pdf">SPAR</a>
                <a href="https://www.spar.hu/content/dam/sparhuwebsite/_flyers/2026/0903/spar-partner-nyitas.pdf">nyitás</a>
                """;
        List<FlyerCatalogParser.DiscoveredPaper> papers = parser.discoverSparPdfs(html, today);
        assertEquals(1, papers.size());
        assertTrue(papers.getFirst().pdfUrl().contains("spar-szorolap-0903p.pdf"));
    }

    @Test
    void parsesPublitasProductsAndPages() {
        FlyerCatalogParser.DiscoveredPaper paper = new FlyerCatalogParser.DiscoveredPaper(
                "aldi", "Régi cím", "https://szorolap.aldi.hu/demo/", null, "aldi:demo", today, today);
        String data = """
                {"config":{"publicationTitle":"ALDI újság 2026.09.03-2026.09.09","downloadPdfUrl":"https://view.publitas.com/x.pdf"}}
                """;
        String spreads = """
                {"spreads":[{"pages":[{"number":2,"images":{"at800":"https://view.publitas.com/page.jpg"},"products":[{"title":"Kakaóscsiga","price":"249"}]}]}]}
                """;
        FlyerCatalogParser.ParsedCatalog catalog = parser.parsePublitas(paper, data, spreads);
        assertEquals("ALDI újság 2026.09.03-2026.09.09", catalog.paper().title());
        assertEquals("https://view.publitas.com/x.pdf", catalog.paper().pdfUrl());
        assertEquals(1, catalog.pages().size());
        assertEquals(2, catalog.pages().getFirst().pageNumber());
        assertEquals("Kakaóscsiga", catalog.products().getFirst().name());
        assertEquals(LocalDate.of(2026, 9, 3), catalog.paper().validFrom());
    }

    @Test
    void extractsHtmlProductsFromJsonLd() {
        String html = """
                <script type="application/ld+json">
                {"@type":"Product","name":"Kakaóscsiga","offers":{"price":"249"}}
                </script>
                """;
        List<FlyerCatalogParser.ParsedProduct> products = parser.extractHtmlProducts(html);
        assertEquals(1, products.size());
        assertEquals("Kakaóscsiga", products.getFirst().name());
        assertTrue(products.getFirst().priceText().contains("249"));
    }
}

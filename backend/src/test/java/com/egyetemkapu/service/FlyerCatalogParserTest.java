package com.egyetemkapu.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
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
    void fallsBackToWeeklySparDamPathsWhenHtmlHasNoPdfs() {
        List<FlyerCatalogParser.DiscoveredPaper> papers = parser.discoverSparPdfs("<html></html>", today);
        assertFalse(papers.isEmpty());
        assertTrue(papers.stream().anyMatch(paper -> paper.pdfUrl().contains("spar-szorolap-0903p.pdf")));
    }

    @Test
    void fallsBackToReweWeeklyLeafletAndSkipsLandingPages() {
        String html = "<a href=\"https://www.penny.hu/reklamujsag\">újság</a>";
        List<FlyerCatalogParser.DiscoveredPaper> papers = parser.discoverPennyPapers(html, today);
        assertTrue(papers.stream().noneMatch(paper -> paper.officialUrl().contains("penny.hu")));
        FlyerCatalogParser.DiscoveredPaper week36 = papers.stream()
                .filter(paper -> "penny:rewe:202636".equals(paper.sourceKey()))
                .findFirst()
                .orElseThrow();
        assertEquals("https://files.rewe.co.at/PennyIntLeaflet/HU/202636/", week36.officialUrl());
        assertEquals(LocalDate.of(2026, 9, 3), week36.validFrom());
        assertEquals(LocalDate.of(2026, 9, 9), week36.validTo());
    }

    @Test
    void parsesPennyFlippingBookPagesAndOcr() {
        FlyerCatalogParser.DiscoveredPaper paper = parser.pennyWeeklyFallbacks(today).stream()
                .filter(item -> "penny:rewe:202636".equals(item.sourceKey()))
                .findFirst()
                .orElseThrow();
        String html = """
                <html><head><title>PENNY 36. heti rekl&#225;m&#250;js&#225;g</title></head>
                <body>
                <a class="internalLink" rel="next" href="./2/" title="kedvezmeny">2</a>
                <a class="internalLink" rel="last" href="./36-37/" title="juttatasok">36-37</a>
                <div id="text-container" itemprop="text">
                  <h1>PENNY 36. heti rekl&#225;m&#250;js&#225;g</h1>
                  <p>Kakaós csiga 249 Ft Made with FlippingBook</p>
                </div>
                </body></html>
                """;
        FlyerCatalogParser.ParsedCatalog catalog = parser.parsePennyLeaflet(paper, html);
        assertEquals("PENNY 36. heti reklámújság", catalog.paper().title());
        assertEquals(36, catalog.pages().size());
        assertTrue(catalog.pages().getFirst().imageUrl().endsWith("page0001_2.jpg"));
        assertEquals("2/", parser.pennyPageRelPath(html, 2));
        assertEquals("36-37/", parser.pennyPageRelPath(html, 36));
        assertTrue(catalog.products().stream().anyMatch(product -> product.priceText().contains("249")));
    }

    @Test
    void extractsPricedItemsFromPlainText() {
        List<FlyerCatalogParser.ParsedProduct> products = parser.extractPricedItems("Kakaós csiga 249 Ft tej 199 Ft", 1);
        assertFalse(products.isEmpty());
        assertTrue(products.getFirst().priceText().contains("Ft"));
    }

    @Test
    void parsesPublitasProductsAndPages() {
        FlyerCatalogParser.DiscoveredPaper paper = new FlyerCatalogParser.DiscoveredPaper(
                "aldi", "Régi cím", "https://szorolap.aldi.hu/demo/", null, "aldi:demo", today, today);
        String data = """
                {"config":{"publicationTitle":"ALDI újság 2026.09.03-2026.09.09","downloadPdfUrl":"https://view.publitas.com/x.pdf"}}
                """;
        String spreads = """
                {"spreads":[{"pages":[{"number":2,"images":{"at800":"/resize/page.jpg"},"products":[{"title":"Kakaóscsiga","price":"249"}]}]}]}
                """;
        FlyerCatalogParser.ParsedCatalog catalog = parser.parsePublitas(paper, data, spreads);
        assertEquals("ALDI újság 2026.09.03-2026.09.09", catalog.paper().title());
        assertEquals("https://view.publitas.com/x.pdf", catalog.paper().pdfUrl());
        assertEquals(1, catalog.pages().size());
        assertEquals(2, catalog.pages().getFirst().pageNumber());
        assertEquals("https://szorolap.aldi.hu/resize/page.jpg", catalog.pages().getFirst().imageUrl());
        assertEquals("Kakaóscsiga", catalog.products().getFirst().name());
        assertEquals(LocalDate.of(2026, 9, 3), catalog.paper().validFrom());
    }

    @Test
    void resolvesRelativeAndProtocolRelativeAssetUrls() {
        assertEquals(
                "https://szorolap.aldi.hu/resize/page.jpg",
                FlyerCatalogParser.resolveAssetUrl("https://szorolap.aldi.hu/aldi_kw36/", "/resize/page.jpg"));
        assertEquals(
                "https://view.publitas.com/page.jpg",
                FlyerCatalogParser.resolveAssetUrl("https://szorolap.aldi.hu/x/", "//view.publitas.com/page.jpg"));
        assertNull(FlyerCatalogParser.resolveAssetUrl("https://szorolap.aldi.hu/x/", "http://evil.example/x.jpg"));
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

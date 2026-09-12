package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;
import com.egyetemkapu.service.FlyerPdfExtractor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FlyerExtractorsTest {

    private static final PDFont BOLD = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
    private static final PDFont BOOK = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

    private final FlyerCatalogParser parser = new FlyerCatalogParser();
    private final FlyerPdfExtractor pdfExtractor = new FlyerPdfExtractor();
    private final GenericFlyerExtractor generic = new GenericFlyerExtractor(parser);
    private final PennyFlyerExtractor penny = new PennyFlyerExtractor(parser);
    private final AldiFlyerExtractor aldi = new AldiFlyerExtractor(parser);

    @Test
    void genericExtractorKeepsCoverProductNamesAndDropsSlogans() {
        String text = """
                ÍNYENC GRILLKOLBÁSZ
                2 330 Ft/kg
                ALKOHOLMENTES SÖR
                238 Ft/l
                699 Ft
                999 Ft
                119 Ft
                165 Ft
                + visszaváltási díj: 50 Ft
                50 Ft
                MOSTANTÓL MÉG TÖBB AKCIÓ!
                1 535 Ft
                """;
        List<FlyerCatalogParser.ParsedProduct> products = generic.extractFromPageText(text, 1);
        assertTrue(products.stream().anyMatch(product -> product.name().toUpperCase().contains("GRILLKOLBÁSZ")),
                products.toString());
        assertTrue(products.stream().anyMatch(product -> product.name().toUpperCase().contains("ALKOHOLMENTES")),
                products.toString());
        assertTrue(products.stream().noneMatch(product ->
                        product.name().toUpperCase().contains("MOSTANTÓL")
                                || product.name().equalsIgnoreCase("csomag")),
                products.toString());
    }

    @Test
    void pennyExtractorSplitsLeafletPagesAndReadsProductNames() {
        String html = """
                <div id="text-container" itemprop="text">
                <p>SISSY TEJ UHT 2,8% zsírtartalom 1 liter CSIRKE ALSÓ- VAGY FELSŐCOMB hűtött termék 700 g, 941 Ft/kg
                KÖNIGSBRAU DOBOZOS SÖR 4% alkoholtartalom 0,5 liter 2 db vásárlásától: 189 Ft/db
                WIPPY TOALETTPAPÍR 3 rétegű 2 cs. vásárlásától: 999 Ft/cs.
                315 225 Ft -28% 189 Ft/db 999 Ft/cs.</p>
                <p>ÉDESBURGONYA I. osztály lédig, kg KARFIOL I. osztály db 899 499 Ft/kg 799 599 Ft/db</p>
                </div>
                """;
        List<String> pages = parser.extractPennyParagraphs(html);
        assertTrue(pages.size() >= 2);
        List<FlyerCatalogParser.ParsedProduct> cover = penny.extractFromPageText(pages.getFirst(), 1);
        assertTrue(cover.stream().anyMatch(product -> product.name().toUpperCase().contains("SISSY")),
                cover.toString());
        assertTrue(cover.stream().noneMatch(product ->
                        product.name().toUpperCase().contains("ÉDESBURGONYA")
                                || product.name().matches("(?i)^\\d+\\s*x.*")),
                cover.toString());
        List<FlyerCatalogParser.ParsedProduct> page2 = penny.extractFromPageText(pages.get(1), 2);
        assertTrue(page2.stream().anyMatch(product -> product.name().toUpperCase().contains("ÉDESBURGONYA")),
                page2.toString());
    }

    @Test
    void pennyExtractorReadsLiveCoverLeafletNames() {
        String cover = """
                éve 09. 10., csütörtök - 09. 16., szerda JÉGKRÉM-KIÁRUSÍTÁS AKÁR -40% VÁLOGATVA ITTHONRÓL \
                SISSY TEJ UHT 2,8% zsírtartalom 1 liter CSIRKE ALSÓ- VAGY FELSŐCOMB hűtött termék 700 g, 941 Ft/kg \
                KÖNIGSBRAU DOBOZOS SÖR 4% alkoholtartalom 0,5 liter 2 db vásárlásától: 189 Ft/db \
                PÖTTYÖS TÚRÓ RUDI MULTIPACK többféle 6 x 51 g WIPPY TOALETTPAPÍR 3 rétegű \
                2 cs. vásárlásától: 999 Ft/cs. KARÁT CSIRKEMELL SONKA 100 g, 2990 Ft/kg \
                GOLDEN CAT MACSKAELEDEL* 2 db vásárlásától: 199 Ft/db PIROS BURGONYA lédig, kg \
                NEKTARIN I. osztály lédig, kg TOLLE TRAPPISTA SAJT 450 g \
                10 tekercs 315 225 Ft -28% 189 Ft/db 999 Ft/cs. \
                2750 1990 Ft/kg 6 db 659 Ft/cs. 449 299 Ft 199 Ft/db 329 259 Ft/kg 899 589 Ft/kg \
                1699 1299 Ft
                """;
        List<FlyerCatalogParser.ParsedProduct> products = penny.extractFromPageText(cover, 1);
        assertTrue(products.stream().anyMatch(product -> product.name().toUpperCase().contains("SISSY")),
                products.toString());
        assertTrue(products.stream().anyMatch(product -> product.name().toUpperCase().contains("CSIRKE")),
                products.toString());
        assertTrue(products.stream().anyMatch(product -> product.name().toUpperCase().contains("SONKA")),
                products.toString());
        assertTrue(products.stream().anyMatch(product -> product.name().toUpperCase().contains("BURGONYA")),
                products.toString());
        assertTrue(products.stream().anyMatch(product -> product.name().toUpperCase().contains("NEKTARIN")),
                products.toString());
        assertTrue(products.stream().anyMatch(product -> product.name().toUpperCase().contains("TRAPPISTA")),
                products.toString());
        assertTrue(products.stream().anyMatch(product -> product.name().toUpperCase().contains("RUDI")),
                products.toString());
        assertTrue(products.stream().anyMatch(product -> product.name().toUpperCase().contains("KÖNIGSBRAU")),
                products.toString());
        assertTrue(products.stream().anyMatch(product -> product.name().toUpperCase().contains("WIPPY")),
                products.toString());
        assertTrue(products.stream().noneMatch(product ->
                        product.name().matches("(?i)^\\d+\\s*x.*")
                                || product.name().toUpperCase().contains("FOKHAGYMA")),
                products.toString());
    }

    @Test
    void genericExtractorDropsUnitSavingLabel() {
        List<FlyerCatalogParser.ParsedProduct> products = generic.extractFromPageText("""
                Ft/kg olcsóbb
                68 Ft
                Magyar trappista
                2999 Ft/kg
                1890 Ft/kg
                """, 1);
        assertTrue(products.stream().anyMatch(product -> product.name().toLowerCase().contains("trappista")),
                products.toString());
        assertTrue(products.stream().noneMatch(product -> product.name().toLowerCase().contains("olcsóbb")),
                products.toString());
    }

    @Test
    void genericExtractorDropsFirstAtOursPrefix() {
        List<FlyerCatalogParser.ParsedProduct> products = generic.extractFromPageText("""
                Először nálunk
                Madre kovászos kenyér
                699 Ft
                50 Ft
                """, 1);
        assertTrue(products.stream().anyMatch(product -> product.name().toLowerCase().contains("madre")),
                products.toString());
        assertTrue(products.stream().noneMatch(product -> product.name().toLowerCase().contains("először")),
                products.toString());
    }

    @Test
    void tescoExtractorJoinsTheBoldLinesOfAWrappedName() throws Exception {
        byte[] pdf = pdf(
                new Line(174, 700, "Magyar", BOLD, 7),
                new Line(174, 692, "trappista", BOLD, 7),
                new Line(174, 684, "sajtkorong", BOLD, 7),
                new Line(174, 676, "csomagolt, kiszerelésben", BOOK, 7),
                new Line(174, 668, "kapható", BOOK, 7),
                new Line(116, 650, "1890", BOLD, 23),
                new Line(132, 642, "Ft/kg", BOLD, 7),
                new Line(20, 100, "A termék a gyulai áruházunkban nem kapható.", BOOK, 6));

        List<ParsedProduct> products = extract(pdf, new TescoFlyerExtractor(parser));

        assertEquals(List.of("Magyar trappista sajtkorong"), names(products), products.toString());
    }

    @Test
    void sparExtractorJoinsRightAlignedNameLines() throws Exception {
        byte[] pdf = pdf(
                Line.rightAligned(460, 700, "S-BUDGET", BOLD, 9),
                Line.rightAligned(460, 689, "füstölt hátsó csülök", BOLD, 9),
                Line.rightAligned(460, 679, "a kiszolgálópultban kapható", BOOK, 8),
                Line.rightAligned(460, 650, "1.590", BOLD, 30),
                Line.rightAligned(460, 630, "Spórolás: 899 Ft", BOLD, 11));

        List<ParsedProduct> products = extract(pdf, new SparFlyerExtractor(parser));

        assertEquals(List.of("S-BUDGET füstölt hátsó csülök"), names(products), products.toString());
    }

    @Test
    void pdfExtractorsIgnoreFlatPageTextSoAFailedDownloadKeepsStoredProducts() {
        String text = "Magyar\ntrappista\nsajtkorong\n1890 Ft/kg";
        assertTrue(new TescoFlyerExtractor(parser).extractFromPageText(text, 1).isEmpty());
        assertTrue(new SparFlyerExtractor(parser).extractFromPageText(text, 1).isEmpty());
    }

    @Test
    void aldiExtractorReadsWholeTextBoxesAndSkipsBrandsAndBanners() {
        String page = """
                09.10. CSÜTÖRTÖKTŐL 09.16. SZERDÁIG
                BBQ

                TOLLE

                TRAPPISTA
                SAJT
                1 990 Ft/kg

                FÜSTÖLT
                BACON
                200 g/csomag
                2 595 Ft/kg
                739025

                MOSTANTÓL MÉG TÖBB AKCIÓ!

                SZUPER
                AI által készült kép
                A termék nem képezi állandó kínálatunk részét, így kedvező ára és átmeneti
                elérhetősége miatt az esetleges fokozott kereslet okán a gondos készlettervezés
                ellenére rövid időn belül elfogyhat az üzletekből.
                """;

        List<ParsedProduct> products = aldi.extractFromPageText(page, 1);

        assertEquals(List.of("TRAPPISTA SAJT", "FÜSTÖLT BACON"), names(products), products.toString());
    }

    @Test
    void pennyExtractorKeepsNamesThatContainTheNonLatin1Vowels() {
        List<ParsedProduct> products = penny.extractFromPageText(
                "VATTACUKOR ÍZŰ FEHÉR SZŐLŐ* I. osztály magnélküli csomagolt 300 g, 2330 Ft/kg", 2);

        assertTrue(products.stream().anyMatch(product -> product.name().equals("VATTACUKOR ÍZŰ FEHÉR SZŐLŐ")),
                products.toString());
        assertTrue(products.stream().noneMatch(product -> product.name().equals("FEHÉR")), products.toString());
    }

    @Test
    void detachedPackNotesAreNotOfferedAsProducts() {
        List<String> blocks = List.of(
                "Csomagolt", "szeletelt, csomagolt", "natúr, pikáns", "többféle 1 db", "2 doboztól",
                "Rosé szőlő", "Egész csirke");

        assertEquals(List.of("Rosé szőlő", "Egész csirke"),
                names(FlyerProductNames.fromBlocks(blocks, 1)));
    }

    private List<ParsedProduct> extract(byte[] pdf, FlyerProductExtractor extractor) {
        return pdfExtractor.extractDocument(pdf, extractor).products();
    }

    private static List<String> names(List<ParsedProduct> products) {
        return products.stream().map(ParsedProduct::name).toList();
    }

    private record Line(float x, float y, String text, PDFont font, float size) {
        static Line rightAligned(float right, float y, String text, PDFont font, float size) {
            return new Line(right - width(text, font, size), y, text, font, size);
        }

        private static float width(String text, PDFont font, float size) {
            try {
                return font.getStringWidth(text) / 1000f * size;
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
        }
    }

    private static byte[] pdf(Line... lines) throws Exception {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream stream = new PDPageContentStream(document, page)) {
                for (Line line : new ArrayList<>(List.of(lines))) {
                    stream.beginText();
                    stream.setFont(line.font(), line.size());
                    stream.newLineAtOffset(line.x(), line.y());
                    stream.showText(line.text());
                    stream.endText();
                }
            }
            document.save(out);
            return out.toByteArray();
        }
    }
}

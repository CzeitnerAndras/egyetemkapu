package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;
import com.egyetemkapu.service.FlyerCatalogParser.TextRun;
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
import java.util.Set;

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
    void sparExtractorKeepsCoverHeroNamesAndDropsBleedAndPackCounts() {
        SparFlyerExtractor extractor = new SparFlyerExtractor(parser);
        List<TextRun> runs = List.of(
                new TextRun(-79.2f, 184f, 79.2f, 8f, "S-BUDGET", "FBUMDI+Poppins-Bold", 8f),
                new TextRun(-79.2f, 193f, 79.2f, 8f, "csirkemellfilé", "FJPMDI+Poppins-Bold", 8f),
                new TextRun(476.5f, 315f, 59f, 13f, "Regnum", "FBUMDI+Poppins-Bold", 13f),
                new TextRun(476.5f, 330f, 80f, 13f, "sertéscomb", "FJPMDI+Poppins-Bold", 13f),
                new TextRun(396f, 399f, 70f, 8f, "Tento Family", "ELFGPK+Poppins-Bold", 8f),
                new TextRun(396f, 409f, 130f, 8f, "toalettpapír megapack", "ELFGPK+Poppins-Bold", 8f),
                new TextRun(396f, 435f, 90f, 8f, "30 tekercs/csomag", "ELFGPK+Poppins-SemiBold", 8f),
                new TextRun(31f, 505f, 145f, 13f, "Regnum lecsókolbász", "FJPMDI+Poppins-Bold", 13f),
                new TextRun(358f, 538f, 72f, 13f, "Gála alma", "FBUMDI+Poppins-Bold", 13f),
                new TextRun(25f, 576f, 84f, 9f, "Vágott sulizsemle", "FBUMDI+Poppins-Bold", 9f),
                new TextRun(302f, 576f, 44f, 9f, "Apenta+", "FBUMDI+Poppins-Bold", 9f),
                new TextRun(302f, 587f, 75f, 9f, "funkcionális ital", "FJPMDI+Poppins-Bold", 9f),
                new TextRun(208f, 640f, 120f, 8f, "48 pack macskaeledel", "ELFGPK+Poppins-Bold", 8f),
                new TextRun(50f, 715f, 33f, 13f, "69 Ft", "FBUMDI+Poppins-Bold", 13f),
                new TextRun(383f, 383f, 157f, 14f, "minden vásárlás után", "FBUMDI+Poppins-Bold", 14f));

        assertEquals(List.of(
                "Regnum sertéscomb",
                "Tento Family toalettpapír megapack",
                "Regnum lecsókolbász",
                "Gála alma",
                "Vágott sulizsemle",
                "Apenta+ funkcionális ital",
                "48 pack macskaeledel"), names(extractor.extractFromLayout(runs, 1)), runs.toString());
    }

    @Test
    void sparExtractorKeepsTheProductLineAttachedToABrandSetInADifferentCut() {
        SparFlyerExtractor extractor = new SparFlyerExtractor(parser);
        List<TextRun> runs = List.of(
                new TextRun(20f, 70f, 60f, 11f, "Nescafé", "FBUMDI+Poppins-Bold", 11f),
                new TextRun(20f, 82f, 90f, 11f, "Dolce Gusto", "FBUMDI+Poppins-Bold", 11f),
                new TextRun(20f, 94f, 85f, 9f, "kávékapszula", "AAHTPF+FJPMDI+Poppins-SemiBold", 9f),
                new TextRun(380f, 70f, 90f, 11f, "Lindt Lindor", "FBUMDI+Poppins-Bold", 11f),
                new TextRun(380f, 82f, 60f, 9f, "desszert", "FJPMDI+Poppins-SemiBold", 9f),
                new TextRun(20f, 150f, 90f, 9f, "16 db/doboztól", "FJPMDI+Poppins-SemiBold", 9f));

        List<String> found = names(extractor.extractFromLayout(runs, 7));

        assertEquals(List.of("Nescafé Dolce Gusto kávékapszula", "Lindt Lindor desszert"), found, found.toString());
        assertTrue(found.stream().noneMatch(name ->
                name.equals("kávékapszula") || name.equals("desszert")), found.toString());
    }

    @Test
    void sparExtractorJoinsAnAccentedProductLineUnderItsBrand() {
        SparFlyerExtractor extractor = new SparFlyerExtractor(parser);
        List<TextRun> runs = List.of(
                new TextRun(89.9f, 183.8f, 22.5f, 5.6f, "Mizo", "AACHGM+Poppins-Bold", 8f),
                new TextRun(89.9f, 193.3f, 65.6f, 5.6f, "Pumpkin Spice", "AACHGM+Poppins-Bold", 8f),
                new TextRun(89.9f, 202.8f, 36.1f, 5.6f, "túró rudi", "AAHTPF+HMTHAE+Poppins-Bold", 8f),
                new TextRun(89.9f, 211.3f, 40f, 4.9f, "5×45 g", "AACHGM+Poppins-Regular", 7f),
                new TextRun(185.7f, 291.2f, 45.8f, 5.6f, "Halloween", "AACHGM+Poppins-Bold", 8f),
                new TextRun(185.7f, 300.7f, 18.9f, 5.6f, "fánk", "AAHTPF+HMTHAE+Poppins-Bold", 8f),
                new TextRun(121.7f, 399.3f, 50.3f, 5.6f, "Mr. Brownie", "AAHTPF+HMTHAE+Poppins-Bold", 8f),
                new TextRun(121.7f, 408.8f, 44.2f, 5.6f, "Halloween", "AACHGM+Poppins-Bold", 8f),
                new TextRun(220.6f, 624.1f, 28.8f, 5.7f, "Univer", "AAHTPF+HMTHAE+Poppins-Bold", 8f),
                new TextRun(220.6f, 633.6f, 45.9f, 5.7f, "Halloween", "AACHGM+Poppins-Bold", 8f),
                new TextRun(220.6f, 643.1f, 36.3f, 5.7f, "majonéz", "AACHGM+Poppins-Bold", 8f));

        assertEquals(List.of(
                "Mizo Pumpkin Spice túró rudi",
                "Halloween fánk",
                "Mr. Brownie Halloween",
                "Univer Halloween majonéz"), names(extractor.extractFromLayout(runs, 2)), runs.toString());
    }

    @Test
    void sparExtractorKeepsTheOfferWhenASloganLineSitsUnderIt() {
        SparFlyerExtractor extractor = new SparFlyerExtractor(parser);
        List<TextRun> runs = List.of(
                new TextRun(509.5f, 494.2f, 48.6f, 8.5f, "MINDEN", "AACHGM+Poppins-Bold", 12f),
                new TextRun(515.9f, 503.8f, 39.1f, 5.6f, "MANNER", "AACHGM+Poppins-Bold", 8f),
                new TextRun(511.4f, 513.4f, 46.4f, 5.6f, "TERMÉK", "AAHTPF+HMTHAE+Poppins-Bold", 8f),
                new TextRun(515.7f, 523.0f, 36.2f, 5.6f, "ÁRÁBÓL!", "AAHTPF+HMTHAE+Poppins-Bold", 8f),
                new TextRun(20f, 640f, 70f, 8f, "Jó reggelt!", "AACHGM+Poppins-Bold", 8f),
                new TextRun(20f, 649.5f, 55f, 5.6f, "félbagett", "AAHTPF+HMTHAE+Poppins-Bold", 8f));

        assertEquals(List.of("MINDEN MANNER TERMÉK", "Jó reggelt! félbagett"),
                names(extractor.extractFromLayout(runs, 13)), runs.toString());
    }

    @Test
    void sparExtractorDropsBadgesAndKeepsTheTwoLetterBrand() {
        SparFlyerExtractor extractor = new SparFlyerExtractor(parser);
        List<TextRun> runs = List.of(
                new TextRun(339.6f, 566f, 32.3f, 11f, "napig", "ELFGPK+Poppins-Bold", 11f),
                new TextRun(493.7f, 392.7f, 82.4f, 13f, "kereskedője", "ELFGPK+Poppins-SemiBold", 13f),
                new TextRun(265.7f, 787.9f, 63.8f, 9f, "www.spar.hu", "FBUMDI+Poppins-Bold", 9f),
                new TextRun(207.9f, 213.8f, 10.8f, 8f, "BB", "FBUMDI+Poppins-Bold", 8f),
                new TextRun(482.5f, 517.9f, 21.3f, 8f, "KEDV", "FBUMDI+Poppins-Bold", 8f),
                new TextRun(503.8f, 514.1f, 16.5f, 8f, "EZM", "FBUMDI+Poppins-Bold", 8f),
                new TextRun(520.3f, 511.2f, 10.4f, 8f, "ÉN", "FBUMDI+Poppins-Bold", 8f),
                new TextRun(530.7f, 509.3f, 5.4f, 8f, "Y", "FBUMDI+Poppins-Bold", 8f),
                new TextRun(148.9f, 63.2f, 13.7f, 13f, "IN", "FBUMDI+Poppins-Bold", 13f),
                new TextRun(162.7f, 61.5f, 9.8f, 13f, "G", "FBUMDI+Poppins-Bold", 13f),
                new TextRun(172.0f, 60.4f, 8.7f, 13f, "Y", "FBUMDI+Poppins-Bold", 13f),
                new TextRun(180.6f, 59.3f, 16.9f, 13f, "EN", "FBUMDI+Poppins-Bold", 13f),
                new TextRun(19.8f, 591f, 46.7f, 8f, "Borsodi sör", "FBUMDI+Poppins-Bold", 8f));

        assertEquals(List.of("BB", "Borsodi sör"), names(extractor.extractFromLayout(runs, 15)), runs.toString());
    }

    @Test
    void pdfExtractorsIgnoreFlatPageTextSoAFailedDownloadKeepsStoredProducts() {
        String text = "Magyar\ntrappista\nsajtkorong\n1890 Ft/kg";
        assertTrue(new TescoFlyerExtractor(parser).extractFromPageText(text, 1).isEmpty());
        assertTrue(new SparFlyerExtractor(parser).extractFromPageText(text, 1).isEmpty());
    }

    @Test
    void auchanExtractorReadsAllCapsOfferNamesFromIpaperText() {
        String cover = """
                52834_MM hipermarket Gyűjtsd a matricákat
                CSIRKE ALSÓ- VAGY FELSŐCOMB Ft/kg, vákuumcsomagoltan
                ÉDESBURGONYA Ft/kg, M/L méret
                SEGAFREDO CAFFÈ CREMA SZEMES KÁVÉ Ft/db, 1 kg
                PEPSI ZERO SZÉNSAVAS ÜDÍTŐITAL 4x2 l 275 Ft/l
                """;
        List<ParsedProduct> products = new AuchanFlyerExtractor(parser).extractFromPageText(cover, 1);
        assertTrue(products.stream().anyMatch(product -> product.name().toUpperCase().contains("CSIRKE")),
                products.toString());
        assertTrue(products.stream().anyMatch(product -> product.name().toUpperCase().contains("ÉDESBURGONYA")),
                products.toString());
        assertTrue(products.stream().anyMatch(product -> product.name().toUpperCase().contains("SEGAFREDO")),
                products.toString());
        assertTrue(products.stream().noneMatch(product -> product.name().toUpperCase().contains("HIPERMARKET")
                || product.name().toUpperCase().contains("MATRICÁ")), products.toString());
    }

    @Test
    void auchanExtractorKeepsACommaInsideAnAllCapsOfferName() {
        String page = """
                AUCHAN KEDVENC FÜSTÖLT-FŐTT, FŰSZERES TARJA 4290 Ft/kg, 3790 Ft/kg, csemegepultban kapható
                ZÁDOR FÜSTÖLT, ELSŐ CSÜLÖK 1590 Ft/kg, 1290 Ft/kg, csemegepultban kapható
                BOGÁDI FÜSTÖLT KOLBÁSZ 5990 Ft/kg, csemege vagy csípős, csemegepultban kapható
                """;

        List<ParsedProduct> products = new AuchanFlyerExtractor(parser).extractFromPageText(page, 4);

        assertEquals(List.of(
                "AUCHAN KEDVENC FÜSTÖLT-FŐTT, FŰSZERES TARJA",
                "ZÁDOR FÜSTÖLT, ELSŐ CSÜLÖK",
                "BOGÁDI FÜSTÖLT KOLBÁSZ"), names(products), products.toString());
    }

    @Test
    void auchanExtractorJoinsOfferNamesBrokenBySoftHyphens() {
        String page = """
                PETRE\u00adZSELYEM\u00adGYÖKÉR Ft/kg, származási hely: Magyarország
                ZELLER\u00adGUMÓ Ft/kg
                AUCHAN KEDVENC GESZTENYE\u00ad TORTA 6990 Ft/kg
                ZELLERSZÁR Ft/csomag
                """;

        List<ParsedProduct> products = new AuchanFlyerExtractor(parser).extractFromPageText(page, 5);

        assertEquals(List.of(
                "PETREZSELYEMGYÖKÉR",
                "ZELLERGUMÓ",
                "AUCHAN KEDVENC GESZTENYETORTA",
                "ZELLERSZÁR"), names(products), products.toString());
    }

    @Test
    void auchanExtractorKeepsPlusSignsAndLongOfferNames() {
        String page = """
                SWISS VITAMINOS DOBOZOS ITAL többféle, 250 ml
                APENTA+ ISOTONIC ITAL többféle, 750 ml, 660 Ft/l, 492 Ft/l + visszaváltási díj 50 Ft
                *BÁRMELY 2 DB VÁSÁRLÁSA ESETÉN
                FONTE ACTIVE CITROM-LIME, BOOST EGZOTIKUS VITAMIN VAGY BEAUTY KOLLAGÉN SZÉNSAVMENTES ITAL 0,75 l
                VITALADE SPORTITAL multivitamin vagy erdei szamóca, 0,7 l
                *BÁRMELY 2 DB VÁSÁRLÁSA ESETÉN
                APENTA+ ITAL többféle, 750 ml
                """;

        List<ParsedProduct> products = new AuchanFlyerExtractor(parser).extractFromPageText(page, 11);

        assertEquals(List.of(
                "SWISS VITAMINOS DOBOZOS ITAL",
                "APENTA+ ISOTONIC ITAL",
                "FONTE ACTIVE CITROM-LIME, BOOST EGZOTIKUS VITAMIN VAGY BEAUTY KOLLAGÉN SZÉNSAVMENTES ITAL",
                "VITALADE SPORTITAL",
                "APENTA+ ITAL"), names(products), products.toString());
    }

    @Test
    void aldiLayoutJoinsABrandStackedAboveItsProduct() {
        List<TextRun> runs = List.of(
                run(163f, 46.9f, "BÉCSI VIRSLI"),
                run(39f, 235.9f, "09.26. SZOMBATTÓL 09.27. VASÁRNAPIG"),
                run(163f, 243.8f, "HÚSMESTER"),
                run(311.8f, 249.4f, "ÉDES-"),
                run(163f, 256.8f, "FRISS CSIRKECOMB"),
                run(311.8f, 262.4f, "BURGONYA"),
                run(29.8f, 266.8f, "DR. OETKER"),
                run(29.8f, 279.8f, "RISTORANTE PIZZA"),
                run(163f, 380.9f, "KOKÁRDÁS"),
                run(163f, 393.9f, "UHT TEJ"));

        List<ParsedProduct> products = aldi.extractFromLayout(runs, 1);

        assertEquals(List.of(
                "BÉCSI VIRSLI",
                "HÚSMESTER FRISS CSIRKECOMB",
                "ÉDESBURGONYA",
                "DR. OETKER RISTORANTE PIZZA",
                "KOKÁRDÁS UHT TEJ"), names(products), products.toString());
    }

    @Test
    void aldiExtractorReadsWholeTextBoxesAndPrefixesBrands() {
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

        assertEquals(List.of("TOLLE TRAPPISTA SAJT", "FÜSTÖLT BACON"), names(products), products.toString());
    }

    @Test
    void aldiExtractorStillPrefixesBbqWhenItIsTheProductBrand() {
        String page = """
                BBQ

                GRILLSZÓSZ
                500 ml/üveg
                599 Ft
                """;

        List<ParsedProduct> products = aldi.extractFromPageText(page, 1);

        assertEquals(List.of("BBQ GRILLSZÓSZ"), names(products), products.toString());
    }

    @Test
    void aldiExtractorJoinsBrandBoxesWithProductNamesEvenWhenOcrReordersThem() {
        String page = """
                09.10. C S Ü T Ö R T Ö K T Ő L 09.16. S Z E R D Á I G

                CSÁSZÁR

                CSIGATÉSZTA
                8 tojásos
                200 g/csomag

                BELLASAN

                TÖKMAGOLAJ
                0,5 l/üveg

                ESPRESSO
                CREMOSO

                TÁBLÁS CSOKOLÁDÉ
                töltött tej- vagy étcsokoládé,
                90 g/darab

                SNACK FUN

                KARLSKRONE

                KENYÉRCHIPS
                250 g/csomag

                ALKOHOLMENTES
                SÖR
                0,5 l/doboz

                BARISSIMO

                TIBI

                POWER FORCE

                SZEMETESZSÁK
                60 literes

                SILVERSTONE

                BARNA
                RUM
                0,7 l/üveg

                ROMEO PREMIUM

                KUTYASNACK
                150 g vagy

                KOKETT

                TOALETTPAPÍR
                2 rétegű
                """;

        List<ParsedProduct> products = aldi.extractFromPageText(page, 12);
        List<String> found = names(products);

        assertEquals(10, found.size(), found.toString());
        assertEquals(Set.of(
                "CSÁSZÁR CSIGATÉSZTA",
                "BELLASAN TÖKMAGOLAJ",
                "BARISSIMO ESPRESSO CREMOSO",
                "TIBI TÁBLÁS CSOKOLÁDÉ",
                "SNACK FUN KENYÉRCHIPS",
                "KARLSKRONE ALKOHOLMENTES SÖR",
                "POWER FORCE SZEMETESZSÁK",
                "SILVERSTONE BARNA RUM",
                "ROMEO PREMIUM KUTYASNACK",
                "KOKETT TOALETTPAPÍR"
        ), Set.copyOf(found), found.toString());
        assertTrue(found.stream().noneMatch(name ->
                name.equals("CSÁSZÁR") || name.equals("CSIGATÉSZTA") || name.equals("BARISSIMO")
                        || name.equals("TIBI") || name.equals("KOKETT")), found.toString());
    }

    @Test
    void aldiExtractorJoinsDoctorOetkerWithThePizzaAndDropsTheUnitOnSweetPotato() {
        String page = """
                09.24. CSÜTÖRTÖKTŐL 09.30. SZERDÁIG
                BÉCSI VIRSLI
                2 x 200 g/csomag

                TÖLTÖTT
                OSTYA

                09.26. SZOMBATTÓL
                09.27. VASÁRNAPIG
                DR. OETKER

                FRISS CSIRKECOMB

                RISTORANTE PIZZA
                340 g vagy 320 g/doboz
                2 644,12 / 2 809,38 Ft/kg

                ÉDES-55 %
                BURGONYA /kg
                999

                HÚSMESTER

                KOKÁRDÁS

                UHT TEJ
                """;

        List<String> found = names(aldi.extractFromPageText(page, 1));

        assertTrue(found.contains("DR. OETKER RISTORANTE PIZZA"), found.toString());
        assertTrue(found.contains("ÉDESBURGONYA"), found.toString());
        assertTrue(found.stream().noneMatch(name ->
                name.equals("DR. OETKER") || name.equals("RISTORANTE PIZZA") || name.contains("/kg")),
                found.toString());
    }

    @Test
    void aldiExtractorKeepsStandaloneOneWordProducts() {
        String page = """
                MINIBUREK
                300 g/csomag
                1 990 Ft/kg

                PUDINGPOR
                40 g/csomag
                739025
                """;

        List<ParsedProduct> products = aldi.extractFromPageText(page, 1);

        assertEquals(List.of("MINIBUREK", "PUDINGPOR"), names(products), products.toString());
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
                "30 tekercs/csomag", "16 db/csomag",
                "Rosé szőlő", "Egész csirke", "Pedigree 40 pack alutasakos kutyaeledel");

        assertEquals(List.of("Rosé szőlő", "Egész csirke", "Pedigree 40 pack alutasakos kutyaeledel"),
                names(FlyerProductNames.fromBlocks(blocks, 1)));
    }

    private List<ParsedProduct> extract(byte[] pdf, FlyerProductExtractor extractor) {
        return pdfExtractor.extractDocument(pdf, extractor).products();
    }

    private static TextRun run(float x, float y, String text) {
        return new TextRun(x, y, 90f, 11f, text, "Bold", 12f);
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

    @Test
    void coopExtractorStacksABrandAboveItsProductAndSkipsPrices() {
        CoopFlyerExtractor extractor = new CoopFlyerExtractor(parser);
        List<TextRun> runs = List.of(
                new TextRun(20, 30, 80, 16, "FRISSEN"),
                new TextRun(20, 120, 36, 16, "Pick"),
                new TextRun(60, 120, 70, 16, "párizsi"),
                new TextRun(20, 150, 30, 16, "289"),
                new TextRun(54, 150, 18, 16, "Ft"),
                new TextRun(320, 118, 52, 16, "Kinga"),
                new TextRun(320, 138, 80, 16, "Formázott"),
                new TextRun(320, 158, 58, 16, "pulyka"),
                new TextRun(384, 158, 48, 16, "szelet")
        );
        List<String> names = extractor.extractFromLayout(runs, 2).stream().map(ParsedProduct::name).toList();
        assertTrue(names.stream().anyMatch(name -> name.equalsIgnoreCase("Pick párizsi")));
        assertTrue(names.stream().anyMatch(name -> name.toLowerCase().contains("kinga")
                && name.toLowerCase().contains("pulyka")));
        assertTrue(names.stream().noneMatch(name -> name.toLowerCase().contains("frissen") || name.contains("289")));
        assertTrue(extractor.extractFromPageText("Anni\nPanni\nBull", 1).isEmpty());
    }

    @Test
    void coopTextLayerKeepsOfferNamesAndDropsPricesAndSlogans() {
        CoopFlyerExtractor extractor = new CoopFlyerExtractor(parser);
        String page = """
                A jó szomszéd
                2026. 10. 08. csütörtöktől 10. 14. szerdáig
                ALFÖLD PRO-COOP ZRT. AJÁNLATA
                Knorr alap
                Gyros fokhagymás öntettel
                40 g,
                Bolognai spagetti
                59 g, 7610 Ft/kg,
                Mexikói chilis bab
                Marry Me csirkés tészta 48 g
                Ft
                Pápai extra sonka*
                399
                Ft
                /10 dkg
                SPÓROLJON TÖBBET!
                Pepsi
                D.E. őröltpörkölt kávé
                Paloma Classic, Karaván
                225 g, 5773 Ft/kg
                COOP KLUB ÁR!
                Hétvégi ajánlat
                Pecsenye kacsa**
                Pulyka felsőcomb filé**
                Sertés bőrös csülökhús***
                Csont nélkül
                * Ajánlatunk csak a csemegepultos üzleteinkben érvényes.
                www.coop.hu
                coop üzletlánc
                """;

        List<String> names = extractor.extractFromPageText(page, 1).stream().map(ParsedProduct::name).toList();

        assertTrue(names.contains("Pápai extra sonka"), names.toString());
        assertTrue(names.contains("Bolognai spagetti"), names.toString());
        assertTrue(names.contains("Marry Me csirkés tészta"), names.toString());
        assertTrue(names.contains("Pepsi"), names.toString());
        assertTrue(names.contains("D.E. őröltpörkölt kávé"), names.toString());
        assertTrue(names.contains("Paloma Classic, Karaván"), names.toString());
        assertTrue(names.contains("Pecsenye kacsa"), names.toString());
        assertTrue(names.contains("Pulyka felsőcomb filé"), names.toString());
        assertTrue(names.contains("Sertés bőrös csülökhús"), names.toString());
        assertTrue(names.stream().noneMatch(name -> name.toLowerCase().contains("spóroljon")
                || name.contains("399")
                || name.toLowerCase().contains("szomszéd")
                || name.toLowerCase().contains("ajánlat")
                || name.toLowerCase().contains("csont")
                || name.toLowerCase().contains("pultban")
                || name.toLowerCase().contains("üzletlánc")), names.toString());
    }

    @Test
    void coopCoverKeepsOfferTitlesAndDropsPackageAndFootnotes() {
        CoopFlyerExtractor extractor = new CoopFlyerExtractor(parser);
        List<TextRun> runs = List.of(
                new TextRun(560, 269, 23, 5, "etel"),
                new TextRun(501, 385, 25, 14, "Pidk"),
                new TextRun(448, 405, 33, 14, "Fresh"),
                new TextRun(484, 405, 42, 14, "Comer"),
                new TextRun(422, 413, 53, 35, "Hot-dog"),
                new TextRun(479, 413, 51, 35, "kolbász"),
                new TextRun(169, 481, 45, 9, "HOT-DOG"),
                new TextRun(302, 532, 80, 18, "HOT-DOGKOLBÁSZ"),
                new TextRun(439, 465, 53, 13, "Klasszikus,"),
                new TextRun(495, 465, 31, 14, "Sajtos"),
                new TextRun(487, 482, 38, 18, "plusz:"),
                new TextRun(462, 502, 64, 12, "Mozzarellás-"),
                new TextRun(410, 520, 43, 12, "szárított"),
                new TextRun(456, 520, 70, 15, "paradicsomos"),
                new TextRun(695, 438, 54, 34, "Panni"),
                new TextRun(634, 467, 59, 39, "Jögös"),
                new TextRun(841, 451, 31, 14, "Anni"),
                new TextRun(876, 451, 38, 14, "Panni"),
                new TextRun(841, 475, 48, 14, "rögös"),
                new TextRun(894, 475, 40, 14, "túró"),
                new TextRun(871, 491, 44, 12, "Félzsíros"),
                new TextRun(859, 837, 24, 14, "Red"),
                new TextRun(886, 837, 28, 14, "Bull"),
                new TextRun(859, 856, 70, 16, "jiaital"),
                new TextRun(859, 876, 36, 14, "több"),
                new TextRun(900, 876, 40, 14, "ízben"),
                new TextRun(836, 914, 75, 14, "Kókusz-áfonya"),
                new TextRun(876, 932, 35, 12, "Ft/liter"),
                new TextRun(74, 1417, 19, 28, "csak"),
                new TextRun(102, 1417, 36, 28, "tőkehúst"),
                new TextRun(141, 1417, 32, 28, "pultban"),
                new TextRun(176, 1417, 41, 28, "értékesítő"),
                new TextRun(276, 1417, 36, 28, "érvényes"),
                new TextRun(578, 1404, 54, 12, "kiszerelés")
        );
        List<String> names = extractor.extractFromLayout(runs, 1).stream().map(ParsedProduct::name).toList();
        assertTrue(names.stream().anyMatch(name -> name.equals("Pick Fresh Corner Hot-dog kolbász")));
        assertTrue(names.stream().anyMatch(name -> name.equals("Anni Panni rögös túró")));
        assertTrue(names.stream().anyMatch(name -> name.equals("Red Bull energiaital több ízben")));
        assertTrue(names.stream().noneMatch(name -> name.toLowerCase().contains("félzsíros")
                || name.toLowerCase().contains("kókusz")
                || name.equals("HOT-DOG") || name.equals("HOT-DOGKOLBÁSZ")
                || name.equals("Panni") || name.equals("Jögös") || name.equals("etel")
                || name.toLowerCase().contains("pultban") || name.toLowerCase().contains("kiszerelés")
                || name.toLowerCase().contains("paradicsom")));
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

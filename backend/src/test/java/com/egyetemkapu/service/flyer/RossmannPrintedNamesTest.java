package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;
import com.egyetemkapu.service.FlyerCatalogParser.TextRun;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RossmannPrintedNamesTest {

    @Test
    void readsTheCaptionPrintedUnderThePhotoInsteadOfANearbyOfferLine() {
        List<TextRun> runs = new ArrayList<>();
        runs.add(line("Legjobb", 257, 84, 205, 85, "ROSSMANNScript-Regular"));
        runs.add(line("30", 336, 208, 29, 33, "ROSSMANNScript-Regular"));
        runs.add(line("%", 365, 208, 11, 19, "ROSSMANNScript-Regular"));
        runs.add(line("a", 391, 186, 6, 7, "ROSSMANNSans-Book"));
        runs.add(line("GARNIER", 397, 186, 29, 7, "ROSSMANNSans-Black"));
        runs.add(line("szövetmaszkokra!", 391, 193, 54, 7, "ROSSMANNSans-Book"));
        runs.add(line("GARNIER", 183, 304, 30, 7, "ROSSMANNSans-Black"));
        runs.add(line("HYALURON", 183, 311, 36, 7, "ROSSMANNSans-Black"));
        runs.add(line("MICELLÁS VÍZ", 183, 318, 42, 7, "ROSSMANNSans-Black"));
        runs.add(line("2199 Ft", 183, 325, 19, 6, "ROSSMANNSans-Bold"));
        runs.add(line("1539", 183, 340, 39, 19, "ROSSMANNSans-Black"));
        runs.add(line("GARNIER", 330, 312, 30, 7, "ROSSMANNSans-Black"));
        runs.add(line("HYALURON", 330, 319, 35, 7, "ROSSMANNSans-Black"));
        runs.add(line("+", 364, 319, 3, 7, "ROSSMANNSans-Black"));
        runs.add(line("BARRIER REPAIR", 330, 327, 53, 7, "ROSSMANNSans-Black"));
        runs.add(line("ROSSMANN+", 394, 329, 43, 7, "ROSSMANNSans-Black"));
        runs.add(line("FÁTYOLMASZK", 330, 334, 46, 7, "ROSSMANNSans-Black"));
        runs.add(line("1", 376, 334, 2, 7, "ROSSMANNSans-Black"));
        runs.add(line("tagoknak:", 394, 336, 39, 7, "ROSSMANNSans-Regular"));
        runs.add(line("1199", 330, 346, 26, 13, "ROSSMANNSans-Black"));
        runs.add(line("28 g", 330, 353, 11, 6, "ROSSMANNSans-Light"));
        runs.add(line("839", 394, 353, 32, 19, "ROSSMANNSans-Black"));
        runs.add(line("BUGATTI VANIGLIA", 37, 334, 60, 7, "ROSSMANNSans-Black"));
        runs.add(line("PURA NŐI EDP", 37, 341, 44, 7, "ROSSMANNSans-Black"));
        runs.add(line("60 ml", 37, 347, 15, 6, "ROSSMANNSans-Light"));
        runs.add(line("7839", 107, 353, 42, 19, "ROSSMANNSans-Black"));
        runs.add(line("az", 183, 438, 9, 7, "ROSSMANNSans-Book"));
        runs.add(line("ELSEVE", 192, 438, 24, 7, "ROSSMANNSans-Black"));
        runs.add(line("sprayre!**", 183, 466, 31, 7, "ROSSMANNSans-Book"));
        runs.add(line("ELSEVE", 183, 478, 25, 7, "ROSSMANNSans-Black"));
        runs.add(line("EXTRAORDINARY", 183, 486, 55, 7, "ROSSMANNSans-Black"));
        runs.add(line("CSODÁS HAJOLAJ", 183, 493, 54, 7, "ROSSMANNSans-Black"));
        runs.add(line("3199", 183, 505, 28, 13, "ROSSMANNSans-Black"));
        runs.add(line("ROSSMANN+", 183, 523, 43, 7, "ROSSMANNSans-Black"));
        runs.add(line("tagoknak:", 183, 530, 38, 7, "ROSSMANNSans-Regular"));
        runs.add(line("2399", 183, 547, 42, 19, "ROSSMANNSans-Black"));
        runs.add(line("ORGANIC SHOP BŐRRADÍR, TESTRADÍR", 183, 718, 122, 7, "ROSSMANNSans-Black"));
        runs.add(line("VAGY", 183, 725, 16, 7, "ROSSMANNSans-Book"));
        runs.add(line("TESTSZUFLÉ", 200, 725, 40, 7, "ROSSMANNSans-Black"));
        runs.add(line("1749", 183, 747, 39, 19, "ROSSMANNSans-Black"));

        List<String> names = RossmannPrintedNames.read(runs, 2).stream().map(ParsedProduct::name).toList();

        assertTrue(names.contains("GARNIER HYALURON MICELLÁS VÍZ"), names.toString());
        assertTrue(names.contains("GARNIER HYALURON+ BARRIER REPAIR FÁTYOLMASZK"), names.toString());
        assertTrue(names.contains("BUGATTI VANIGLIA PURA NŐI EDP"), names.toString());
        assertTrue(names.contains("ELSEVE EXTRAORDINARY CSODÁS HAJOLAJ"), names.toString());
        assertTrue(names.contains("ORGANIC SHOP BŐRRADÍR, TESTRADÍR VAGY TESTSZUFLÉ"), names.toString());
        assertFalse(names.stream().anyMatch(name -> name.toLowerCase().contains("textil")
                || name.toLowerCase().contains("szövet")
                || name.toLowerCase().contains("legjobb")
                || name.toLowerCase().contains("sprayre")), names.toString());
        assertTrue(names.stream().filter(name -> name.contains("FÁTYOLMASZK")).count() == 1, names.toString());
    }

    @Test
    void readsTheCoverOffersPrintedBesideTheShelfPrice() {
        List<TextRun> runs = List.of(
                new TextRun(117.3f, 242.1f, 61.3f, 6.5f, "MAX FACTOR", "ROSSMANNSans-Black", 10f),
                new TextRun(109.7f, 285.4f, 81.7f, 5.6f, "MAX FACTOR GLOW", "ROSSMANNSans-Black", 9f),
                new TextRun(109.7f, 295.2f, 103.9f, 5.6f, "FRAMER 20 BRONZOSÍTÓ", "ROSSMANNSans-Black", 9f),
                new TextRun(109.7f, 304.9f, 91.1f, 5.6f, "ÉS RAGYOGÁSFOKOZÓ", "ROSSMANNSans-Black", 9f),
                new TextRun(109.7f, 322.8f, 44.3f, 12.3f, "5399", "ROSSMANNSans-Black", 19f),
                new TextRun(109.7f, 375.1f, 66.7f, 17.6f, "4049", "ROSSMANNSans-Black", 28f),
                new TextRun(272.4f, 267.8f, 55.8f, 5.6f, "SILAN ÖBLÍTŐ", "ROSSMANNSans-Black", 9f),
                new TextRun(301.3f, 278.3f, 26.9f, 5.5f, "1661 Ft", "ROSSMANNSans-Bold", 9f),
                new TextRun(262.7f, 300.8f, 56.5f, 17.6f, "1199", "ROSSMANNSans-Black", 28f));

        List<String> names = RossmannPrintedNames.read(runs, 1).stream().map(ParsedProduct::name).toList();

        assertEquals(List.of(
                "SILAN ÖBLÍTŐ",
                "MAX FACTOR GLOW FRAMER 20 BRONZOSÍTÓ ÉS RAGYOGÁSFOKOZÓ"), names);
    }

    private static TextRun line(String text, float x, float y, float width, float size, String font) {
        return new TextRun(x, y, width, size, text, font, size);
    }
}

package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;
import com.egyetemkapu.service.FlyerCatalogParser.TextRun;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class FlyerExtractorFixturesTest {

    private final FlyerCatalogParser parser = new FlyerCatalogParser();

    // --- Pinned names ---
    @Test
    void pinnedStoreFixtures() throws IOException {
        assertEquals(names("aldi"), extract("aldi"));
        assertEquals(names("spar"), extract("spar"));
        assertEquals(names("penny"), extract("penny"));
        assertEquals(names("tesco"), extract("tesco"));
        assertEquals(names("auchan"), extract("auchan"));
        assertEquals(names("coop"), extract("coop"));
        assertEquals(names("lidl"), extract("lidl"));
        assertEquals(names("rossmann"), extract("rossmann"));
        assertEquals(names("dm"), extract("dm"));
    }

    // --- Fixtures ---
    private List<String> extract(String store) throws IOException {
        List<ParsedProduct> products = switch (store) {
            case "aldi" -> new AldiFlyerExtractor(parser).extractFromLayout(layout(store), 1);
            case "spar" -> new SparFlyerExtractor(parser).extractFromLayout(layout(store), 1);
            case "penny" -> new PennyFlyerExtractor(parser).extractFromPageText(text(store + ".text"), 1);
            case "tesco" -> new TescoFlyerExtractor(parser).extractFromLayout(layout(store), 1);
            case "auchan" -> new AuchanFlyerExtractor(parser).extractFromPageText(text(store + ".text"), 1);
            case "coop" -> new CoopFlyerExtractor(parser).extractFromPageText(text(store + ".text"), 1);
            case "lidl" -> new LidlFlyerExtractor(parser).extractFromLayout(layout(store), 1);
            case "rossmann" -> RossmannPrintedNames.read(layout(store), 1);
            case "dm" -> parser.dmProducts(text("dm.hotspots.json"), 1, text("dm.page.txt"));
            default -> throw new IllegalArgumentException(store);
        };
        return products.stream().map(ParsedProduct::name).toList();
    }

    private List<String> names(String store) throws IOException {
        return text(store + ".names").lines().map(String::trim).filter(line -> !line.isEmpty()).toList();
    }

    private List<TextRun> layout(String store) throws IOException {
        List<TextRun> runs = new ArrayList<>();
        for (String line : text(store + ".layout").lines().map(String::trim).filter(value -> !value.isEmpty()).toList()) {
            String[] parts = line.split("\\|", 7);
            if (parts.length != 7) {
                throw new IllegalArgumentException(store + ": " + line);
            }
            runs.add(new TextRun(
                    Float.parseFloat(parts[0]),
                    Float.parseFloat(parts[1]),
                    Float.parseFloat(parts[2]),
                    Float.parseFloat(parts[3]),
                    parts[6],
                    parts[4],
                    Float.parseFloat(parts[5])));
        }
        return runs;
    }

    private static String text(String name) throws IOException {
        try (var in = FlyerExtractorFixturesTest.class.getResourceAsStream("/flyer-fixtures/" + name)) {
            if (in == null) {
                throw new IllegalArgumentException("Missing fixture " + name);
            }
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}

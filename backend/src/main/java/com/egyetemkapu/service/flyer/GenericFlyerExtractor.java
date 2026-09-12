package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;
import com.egyetemkapu.service.FlyerCatalogParser.TextRun;

import java.util.List;

public class GenericFlyerExtractor implements FlyerProductExtractor {

    private final FlyerCatalogParser parser;

    public GenericFlyerExtractor(FlyerCatalogParser parser) {
        this.parser = parser;
    }

    @Override
    public String store() {
        return "";
    }

    @Override
    public List<ParsedProduct> extractFromPageText(String text, int pageNumber) {
        return parser.extractProductNames(text, pageNumber);
    }

    @Override
    public List<ParsedProduct> extractFromLayout(List<TextRun> runs, int pageNumber) {
        List<ParsedProduct> layout = parser.extractProductNamesFromLayout(runs, pageNumber);
        if (!layout.isEmpty()) {
            return layout;
        }
        return extractFromPageText(joinRuns(runs), pageNumber);
    }

    static String joinRuns(List<TextRun> runs) {
        if (runs == null || runs.isEmpty()) {
            return "";
        }
        StringBuilder text = new StringBuilder();
        for (TextRun run : runs) {
            if (run == null || run.text() == null || run.text().isBlank()) {
                continue;
            }
            if (!text.isEmpty()) {
                text.append('\n');
            }
            text.append(run.text().trim());
        }
        return text.toString();
    }
}

package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;

import java.util.List;

public class MetroFlyerExtractor implements FlyerProductExtractor {

    private final FlyerCatalogParser parser;

    public MetroFlyerExtractor(FlyerCatalogParser parser) {
        this.parser = parser;
    }

    @Override
    public String store() {
        return "metro";
    }

    @Override
    public List<ParsedProduct> extractFromPageText(String text, int pageNumber) {
        return parser.metroProducts(text, pageNumber);
    }
}

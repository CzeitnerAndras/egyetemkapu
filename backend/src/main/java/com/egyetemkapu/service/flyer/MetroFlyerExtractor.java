package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;

import java.util.List;

/*
Metro prints the brand on its own capitalised line and the product name on the next line.
Pack size, "többféle", quantity breaks and forint prices sit between those names.
 */
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

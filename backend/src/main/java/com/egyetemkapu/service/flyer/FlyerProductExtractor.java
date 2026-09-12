package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedCatalog;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedPage;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;
import com.egyetemkapu.service.FlyerCatalogParser.TextRun;

import java.util.ArrayList;
import java.util.List;

public interface FlyerProductExtractor {

    String store();

    List<ParsedProduct> extractFromPageText(String text, int pageNumber);

    default List<ParsedProduct> extractFromLayout(List<TextRun> runs, int pageNumber) {
        return FlyerCatalogParser.keepPresentableProducts(List.of());
    }

    default ParsedCatalog fillProducts(ParsedCatalog catalog) {
        if (catalog == null) {
            return null;
        }
        if (hasStructuredProducts(catalog.products())) {
            return new ParsedCatalog(
                    catalog.paper(),
                    catalog.pages(),
                    FlyerCatalogParser.keepPresentableProducts(catalog.products()));
        }
        List<ParsedProduct> products = new ArrayList<>();
        if (catalog.pages() != null) {
            for (ParsedPage page : catalog.pages()) {
                products.addAll(extractFromPageText(page.text(), page.pageNumber()));
            }
        }
        if (products.isEmpty() && catalog.products() != null) {
            products.addAll(FlyerCatalogParser.keepPresentableProducts(catalog.products()));
        }
        return new ParsedCatalog(catalog.paper(), catalog.pages(), products);
    }

    private static boolean hasStructuredProducts(List<ParsedProduct> products) {
        if (products == null || products.isEmpty()) {
            return false;
        }
        return products.stream().anyMatch(product ->
                product.name() != null
                        && product.name().length() >= 4
                        && !FlyerCatalogParser.isWeakProductName(product.name()));
    }
}

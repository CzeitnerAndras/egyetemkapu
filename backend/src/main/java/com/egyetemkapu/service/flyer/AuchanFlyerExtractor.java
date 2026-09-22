package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;
import com.egyetemkapu.service.FlyerCatalogParser.TextRun;
import com.egyetemkapu.service.HungarianText;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class AuchanFlyerExtractor extends GenericFlyerExtractor {

    private static final float MIN_SIZE = 7.2f;
    private static final float MAX_SIZE = 14.5f;
    private static final Pattern OFFER_NAME = Pattern.compile(
            "(?u)(?<!\\p{L})([A-ZÁÉÍÓÖŐÚÜŰ][A-ZÁÉÍÓÖŐÚÜŰ0-9*.’'-]{3,}"
                    + "(?:(?:[ \\t]+|-)[A-ZÁÉÍÓÖŐÚÜŰ][A-ZÁÉÍÓÖŐÚÜŰ0-9*.’'.-]{0,}){0,8})(?!\\p{L})");

    public AuchanFlyerExtractor(FlyerCatalogParser parser) {
        super(parser);
    }

    @Override
    public String store() {
        return "auchan";
    }

    @Override
    public List<ParsedProduct> extractFromLayout(List<TextRun> runs, int pageNumber) {
        return FlyerProductNames.fromBlocks(
                FlyerLayout.nameBlocks(runs, AuchanFlyerExtractor::isNameLine), pageNumber);
    }

    @Override
    public List<ParsedProduct> extractFromPageText(String text, int pageNumber) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        List<ParsedProduct> offers = extractOffers(text, pageNumber);
        if (!offers.isEmpty()) {
            return FlyerCatalogParser.keepPresentableProducts(offers);
        }
        return super.extractFromPageText(text, pageNumber);
    }

    private List<ParsedProduct> extractOffers(String text, int pageNumber) {
        Matcher matcher = OFFER_NAME.matcher(text.replace('\u00a0', ' '));
        List<ParsedProduct> products = new ArrayList<>();
        while (matcher.find()) {
            String name = FlyerCatalogParser.tidyProductName(matcher.group(1).replace('*', ' '));
            if (name.isBlank() || skipName(name)) {
                continue;
            }
            products.add(new ParsedProduct(name, pageNumber, null));
        }
        return products;
    }

    private static boolean skipName(String name) {
        if (FlyerCatalogParser.isWeakProductName(name) || FlyerCatalogParser.isSloganName(name)) {
            return true;
        }
        String normalized = HungarianText.normalize(name);
        return normalized.contains("hipermarket")
                || normalized.contains("szupermarket")
                || normalized.contains("matricagyujtes")
                || normalized.contains("matrica")
                || normalized.contains("bizalomkartya")
                || normalized.contains("tenyleg ennyi")
                || normalized.contains("ervenyes")
                || normalized.contains("vasarolj")
                || normalized.contains("szerezd")
                || normalized.contains("kupont")
                || normalized.contains("normal eladasi")
                || normalized.contains("elindult")
                || normalized.contains("gyujtsd")
                || normalized.contains("tovabbi reszletek")
                || normalized.contains("okauchan")
                || name.length() < 5;
    }

    private static boolean isNameLine(TextRun run) {
        return FlyerLayout.fontEndsWith(run, "-Bold", "-SemiBold", "Bold", "Black")
                && run.fontSize() >= MIN_SIZE
                && run.fontSize() <= MAX_SIZE
                && !FlyerLayout.isFootnote(run.text());
    }
}

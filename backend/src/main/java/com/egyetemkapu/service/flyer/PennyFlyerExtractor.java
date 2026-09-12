package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;
import com.egyetemkapu.service.HungarianText;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class PennyFlyerExtractor extends GenericFlyerExtractor {

    private static final Pattern OFFER_NAME = Pattern.compile(
            "(?u)(?<!\\p{L})([A-ZÁÉÍÓÖŐÚÜŰ][A-ZÁÉÍÓÖŐÚÜŰ0-9*.’'-]{3,}"
                    + "(?:(?:[ \\t]+|-)[A-ZÁÉÍÓÖŐÚÜŰ][A-ZÁÉÍÓÖŐÚÜŰ0-9*.’'.-]{0,}){0,8})(?!\\p{L})");
    private static final Pattern TITLE_NAME = Pattern.compile(
            "(?u)(?<!\\p{L})([A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű*]{2,}"
                    + "(?:[ \\t]+[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű*]{2,}){1,4})(?!\\p{L})");
    private static final Pattern MARKETING = Pattern.compile(
            "(?iu)válogatva itthonról|pici árak?\\.?|jégkrém-kiárusítás|akár|"
                    + "penny kártyával(?: még olcsóbb)?|penny kártya(?: nélkül)?|"
                    + "részletek az üzletekben\\.?|az eladási ár a visszaváltási díjat nem tartalmazza\\.?");

    public PennyFlyerExtractor(FlyerCatalogParser parser) {
        super(parser);
    }

    @Override
    public String store() {
        return "penny";
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
        return FlyerCatalogParser.keepPresentableProducts(super.extractFromPageText(text, pageNumber));
    }

    private List<ParsedProduct> extractOffers(String text, int pageNumber) {
        String cleaned = MARKETING.matcher(text.replace('\u00a0', ' '))
                .replaceAll(" | ")
                .replaceAll("[\\t ]+", " ")
                .trim();
        List<Offer> offers = collectOffers(cleaned);
        List<ParsedProduct> products = new ArrayList<>();
        for (Offer offer : offers) {
            products.add(new ParsedProduct(offer.name, pageNumber, null));
        }
        return products;
    }

    private static List<Offer> collectOffers(String text) {
        List<Offer> offers = new ArrayList<>();
        addOffers(offers, OFFER_NAME.matcher(text));
        addOffers(offers, TITLE_NAME.matcher(text));
        offers.sort((left, right) -> {
            int byStart = Integer.compare(left.start, right.start);
            if (byStart != 0) {
                return byStart;
            }
            return Integer.compare(right.end - right.start, left.end - left.start);
        });
        List<Offer> unique = new ArrayList<>();
        for (Offer offer : offers) {
            int overlapAt = -1;
            for (int i = 0; i < unique.size(); i++) {
                Offer existing = unique.get(i);
                if (offer.start < existing.end && offer.end > existing.start) {
                    overlapAt = i;
                    break;
                }
            }
            if (overlapAt < 0) {
                unique.add(offer);
                continue;
            }
            Offer existing = unique.get(overlapAt);
            if (offer.end - offer.start > existing.end - existing.start) {
                unique.set(overlapAt, offer);
            }
        }
        unique.sort((left, right) -> Integer.compare(left.start, right.start));
        return unique;
    }

    private static void addOffers(List<Offer> offers, Matcher matcher) {
        while (matcher.find()) {
            String name = tidyName(matcher.group(1));
            if (name.isBlank() || skipName(name)) {
                continue;
            }
            offers.add(new Offer(name, matcher.start(), matcher.end()));
        }
    }

    private static String tidyName(String name) {
        String cleaned = name.replace('*', ' ').replaceAll("\\s+", " ").trim();
        cleaned = cleaned.replaceAll("(?iu)\\s+(?:I|II|III)\\.?$", "");
        return cleaned;
    }

    private static boolean skipName(String name) {
        if (FlyerCatalogParser.isWeakProductName(name) || FlyerCatalogParser.isSloganName(name)) {
            return true;
        }
        String normalized = HungarianText.normalize(name);
        return normalized.contains("penny kartya")
                || normalized.contains("valogatva")
                || normalized.contains("jegy krem")
                || normalized.contains("jegkrem")
                || normalized.contains("akcio ervenyessege")
                || normalized.contains("tovabbi")
                || normalized.equals("akar")
                || normalized.equals("uht")
                || normalized.startsWith("i. osztaly")
                || normalized.startsWith("db-tol")
                || normalized.startsWith("cs-tol")
                || normalized.contains("digitalis")
                || name.length() < 5;
    }

    private static final class Offer {
        private final String name;
        private final int start;
        private final int end;

        private Offer(String name, int start, int end) {
            this.name = name;
            this.start = start;
            this.end = end;
        }
    }
}

package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;
import com.egyetemkapu.service.HungarianText;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

final class FlyerProductNames {

    private static final int MAX_PER_PAGE = 80;
    private static final int MAX_WORDS = 8;
    private static final Pattern FOOTNOTE_MARKS = Pattern.compile("[*\u2020\u00b9\u00b2\u00b3]+");
    private static final Pattern WEEKDAY = Pattern.compile(
            "(?iu)h[eé]tf[oő]|kedd|szerd[aá]|cs[uü]t[oö]rt[oö]k|p[eé]ntek|szombat|vas[aá]rnap");
    private static final Set<String> TRAILING_STOPWORDS =
            Set.of("es", "vagy", "mint", "mar", "is", "a", "az", "de", "majd", "plusz", "csak");
    private static final Set<String> FILLER_WORDS = Set.of("minden", "osszes", "barmely", "tobbfele");
    private static final Set<String> DESCRIPTOR_WORDS = Set.of(
            "csomagolt", "szeletelt", "natur", "pikans", "tobbfele", "hutott", "gyorsfagyasztott",
            "egesz", "friss", "db", "cs", "doboz", "csomag", "darab", "adag", "kg", "dkg", "g", "ml",
            "cl", "dl", "l", "es", "vagy", "tol", "ig");
    private static final Pattern QUANTITY_BADGE = Pattern.compile(
            "(?iu)^\\d+\\s*(?:db|cs\\.?|doboz|darab|csomag|adag)[- .]*t[oóöő]l$");

    private FlyerProductNames() {
    }

    static List<ParsedProduct> fromBlocks(List<String> blocks, int pageNumber) {
        Map<String, ParsedProduct> products = new LinkedHashMap<>();
        for (String block : blocks) {
            String raw = block == null ? "" : block.replaceAll("\\s+", " ").trim();
            String name = tidy(raw);
            if (name.isEmpty() || readsAsProse(raw) || readsAsProse(name)
                    || FlyerCatalogParser.isJunkProductName(raw)
                    || FlyerCatalogParser.isJunkProductName(name)) {
                continue;
            }
            products.putIfAbsent(HungarianText.normalize(name), new ParsedProduct(name, pageNumber, null));
            if (products.size() >= MAX_PER_PAGE) {
                break;
            }
        }
        return new ArrayList<>(products.values());
    }

    static String tidy(String raw) {
        if (raw == null) {
            return "";
        }
        String cleaned = FOOTNOTE_MARKS.matcher(raw).replaceAll(" ");
        cleaned = FlyerCatalogParser.tidyProductName(cleaned);
        return cleaned.replaceAll("\\s+", " ").trim();
    }

    private static boolean readsAsProse(String name) {
        if (name.isEmpty()) {
            return false;
        }
        String[] words = name.split("\\s+");
        if (words.length > MAX_WORDS || name.endsWith(",") || name.endsWith("!") || name.endsWith("?")
                || WEEKDAY.matcher(name).find()
                || QUANTITY_BADGE.matcher(name).matches()
                || FILLER_WORDS.contains(HungarianText.normalize(name))
                || onlyDescribes(words)
                || TRAILING_STOPWORDS.contains(HungarianText.normalize(words[words.length - 1]))) {
            return true;
        }
        if (words.length == 1 && name.length() < 4) {
            return true;
        }
        int singles = 0;
        int digits = 0;
        int letters = 0;
        for (String word : words) {
            if (word.length() == 1) {
                singles++;
            }
        }
        for (int i = 0; i < name.length(); i++) {
            if (Character.isDigit(name.charAt(i))) {
                digits++;
            } else if (Character.isLetter(name.charAt(i))) {
                letters++;
            }
        }
        return digits > letters || (words.length >= 4 && singles * 10 >= words.length * 3);
    }

    private static boolean onlyDescribes(String[] words) {
        for (String word : words) {
            String key = HungarianText.normalize(word).replaceAll("[^\\p{L}\\p{N}]", "");
            if (!key.isEmpty() && !key.matches("\\d+") && !DESCRIPTOR_WORDS.contains(key)) {
                return false;
            }
        }
        return true;
    }
}

package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;
import com.egyetemkapu.service.FlyerCatalogParser.TextRun;
import com.egyetemkapu.service.HungarianText;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/*
ALDI publishes through Publitas, which hands back one text blob per page where each text box of the artwork is separated by a blank line.
A box holds the product name on its own first lines, in caps, followed by the pack size, unit price and article number.
Reading line by line therefore splits "FÜSTÖLT / BACON" into two products, so whole boxes are read here instead.
Own-brand labels sit in a separate box from the product name. Publitas does not keep visual order, so a brand may
arrive immediately before its product, in a brand run followed by a product run, or after the product names of that row.
 */
public class AldiFlyerExtractor extends GenericFlyerExtractor {

    private static final Pattern BLANK_LINE = Pattern.compile("\\R\\s*\\R");
    private static final Pattern VALIDITY_LINE = Pattern.compile(
            "(?iu)\\d{1,2}\\s*[.]\\s*\\d{1,2}.*(?:h[eé]tf[oő]|kedd|szerd|cs[uü]t[oö]rt[oö]k|p[eé]ntek|szombat|vas[aá]rnap)");
    private static final Pattern MARKETING = Pattern.compile(
            "(?iu)\\baldi\\b|akci[oó]|aj[aá]nlat|sz[aá]ll[ií]tjuk|olcs[oó]|h[uű]s[eé]gprogram|pontgy[uű]jt[eé]s"
                    + "|k[ií]n[aá]lat|felt[eé]tel|h[ií]rlev[eé]l|szuper|k[eé]szlet erej[eé]ig"
                    + "|cs[oö]kkentett[uü]k|t[oö]bb mint|vigy[eé]l vissza|friss[eé]ss[eé]g|azon meleg[eé]ben");
    private static final Set<String> BRAND_SUFFIXES = Set.of(
            "bio", "crown", "family", "force", "fun", "gourmet", "line", "mark", "nobile",
            "oro", "premium", "roth", "seasons", "stone", "zentrale");
    private static final Set<String> HOUSE_BRANDS = Set.of(
            "adventuridge", "all seasons", "almare seafood", "almat", "alpenmark", "back family", "barissimo",
            "bbq", "bellasan", "biozentrale", "casalucci", "choceur", "csaszar", "cucina nobile", "delikato",
            "eurogourmet", "fishermans", "gardenline", "goldahren", "grandessa", "gut bio", "husmester",
            "karlskrone", "kings crown", "kokardas", "kokett", "lacura", "mamia", "milsani", "moser roth",
            "novitesse", "ocean sea", "ombia", "piroska", "power force", "rio d'oro", "romeo", "romeo premium",
            "royal", "silverstone", "simply", "snack fun", "suntat", "tandil", "tibi", "tolle", "valdor",
            "villa gusto", "vitalis", "westminster", "workzone");

    public AldiFlyerExtractor(FlyerCatalogParser parser) {
        super(parser);
    }

    @Override
    public String store() {
        return "aldi";
    }

    @Override
    public List<ParsedProduct> extractFromPageText(String text, int pageNumber) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        List<String> names = new ArrayList<>();
        for (String box : BLANK_LINE.split(text.replace('\u00a0', ' '))) {
            String name = nameOf(box);
            if (name != null) {
                names.add(name);
            }
        }
        return FlyerProductNames.fromBlocks(pairBrands(names), pageNumber);
    }

    @Override
    public List<ParsedProduct> extractFromLayout(List<TextRun> runs, int pageNumber) {
        return List.of();
    }

    private static List<String> pairBrands(List<String> names) {
        List<String> merged = new ArrayList<>();
        List<String> unmatchedProducts = new ArrayList<>();
        int index = 0;
        while (index < names.size()) {
            if (isBrand(names, index)) {
                List<String> brands = new ArrayList<>();
                while (index < names.size() && isBrand(names, index)) {
                    if (isSectionTitle(names, index)) {
                        index++;
                        continue;
                    }
                    brands.add(names.get(index++));
                }
                List<String> products = new ArrayList<>();
                while (index < names.size() && !isBrand(names, index)) {
                    products.add(names.get(index++));
                }
                if (products.isEmpty()) {
                    attachBrands(brands, unmatchedProducts, merged);
                    continue;
                }
                if (brands.size() <= products.size()) {
                    for (int pair = 0; pair < brands.size(); pair++) {
                        merged.add(join(brands.get(pair), products.get(pair)));
                    }
                    unmatchedProducts.addAll(products.subList(brands.size(), products.size()));
                } else {
                    int extra = brands.size() - products.size();
                    attachBrands(brands.subList(0, extra), unmatchedProducts, merged);
                    for (int pair = 0; pair < products.size(); pair++) {
                        merged.add(join(brands.get(extra + pair), products.get(pair)));
                    }
                }
            } else {
                unmatchedProducts.add(names.get(index++));
            }
        }
        merged.addAll(unmatchedProducts);
        return merged;
    }

    private static void attachBrands(List<String> brands, List<String> unmatchedProducts, List<String> merged) {
        int pairs = Math.min(brands.size(), unmatchedProducts.size());
        for (int pair = 0; pair < pairs; pair++) {
            merged.add(join(brands.get(pair), unmatchedProducts.get(pair)));
        }
        if (pairs > 0) {
            unmatchedProducts.subList(0, pairs).clear();
        }
    }

    private static String join(String brand, String product) {
        String brandKey = HungarianText.normalize(brand);
        String productKey = HungarianText.normalize(product);
        if (productKey.equals(brandKey) || productKey.startsWith(brandKey + " ")) {
            return product;
        }
        return brand + " " + product;
    }

    private static boolean isBrand(List<String> names, int index) {
        return isKnownBrand(names.get(index));
    }

    private static boolean isKnownBrand(String name) {
        return isHouseBrand(name) || isMultiWordBrand(name);
    }

    private static boolean isSectionTitle(List<String> names, int index) {
        String name = names.get(index).trim();
        return isHouseBrand(name)
                && name.indexOf(' ') < 0
                && name.length() <= 3
                && index + 1 < names.size()
                && isBrand(names, index + 1);
    }

    private static boolean isMultiWordBrand(String name) {
        String[] words = name.trim().split("\\s+");
        if (words.length < 2) {
            return false;
        }
        String suffix = HungarianText.normalize(words[words.length - 1]).replaceAll("[^a-z0-9]+", "");
        return BRAND_SUFFIXES.contains(suffix);
    }

    private static String nameOf(String box) {
        List<String> parts = new ArrayList<>();
        for (String raw : box.split("\\R")) {
            String line = raw.trim();
            if (line.isEmpty() || VALIDITY_LINE.matcher(line).find()) {
                continue;
            }
            if (MARKETING.matcher(line).find()) {
                return null;
            }
            if (isNameLine(line, !parts.isEmpty())) {
                parts.add(line);
            } else if (!parts.isEmpty()) {
                break;
            }
        }
        if (parts.isEmpty()) {
            return null;
        }
        return String.join(" ", parts);
    }

    private static boolean isHouseBrand(String name) {
        String key = HungarianText.normalize(name)
                .replace('\u2019', '\'')
                .replace('\u2018', '\'');
        return HOUSE_BRANDS.contains(key);
    }

    private static boolean isNameLine(String line, boolean continuation) {
        if (isKnownBrand(line)) {
            return true;
        }
        return isShouted(line, continuation) && !FlyerLayout.isPriceLike(line) && !isLetterSpaced(line);
    }

    private static boolean isShouted(String line, boolean continuation) {
        int letters = 0;
        int upper = 0;
        for (int i = 0; i < line.length(); i++) {
            char character = line.charAt(i);
            if (Character.isLetter(character)) {
                letters++;
                if (Character.isUpperCase(character)) {
                    upper++;
                }
            }
        }
        int minimum = continuation ? 3 : 4;
        return letters >= minimum && upper * 10 >= letters * 8;
    }

    private static boolean isLetterSpaced(String line) {
        String[] words = line.split("\\s+");
        if (words.length < 4) {
            return false;
        }
        int singles = 0;
        for (String word : words) {
            if (word.length() == 1) {
                singles++;
            }
        }
        return singles * 10 >= words.length * 3;
    }
}
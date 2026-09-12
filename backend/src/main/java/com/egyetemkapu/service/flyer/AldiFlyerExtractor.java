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
 */
public class AldiFlyerExtractor extends GenericFlyerExtractor {

    private static final Pattern BLANK_LINE = Pattern.compile("\\R\\s*\\R");
    private static final Pattern MARKETING = Pattern.compile(
            "(?iu)\\baldi\\b|akci[oó]|aj[aá]nlat|sz[aá]ll[ií]tjuk|olcs[oó]|h[uű]s[eé]gprogram|pontgy[uű]jt[eé]s"
                    + "|k[ií]n[aá]lat|felt[eé]tel|h[ií]rlev[eé]l|szuper|k[eé]szlet erej[eé]ig"
                    + "|cs[oö]kkentett[uü]k|t[oö]bb mint");

    /*
    Own-brand text boxes sit above the product name as a separate box, so they arrive as their own candidate. 
    Listing them keeps "TOLLE" out of the sidebar while single-word products such as "MINIBUREK" or "PUDINGPOR" stay.
     */
    private static final Set<String> HOUSE_BRANDS = Set.of(
            "adventuridge", "all seasons", "almat", "alpenmark", "back family", "bellasan", "biozentrale",
            "cucina nobile", "delikato", "eurogourmet", "fishermans", "gardenline", "goldahren", "gut bio",
            "husmester", "karlskrone", "kings crown", "lacura", "mamia", "milsani", "moser roth",
            "novitesse", "ombia", "piroska", "rio d'oro", "royal", "simply", "suntat", "tandil",
            "tolle", "vitalis", "westminster", "workzone");

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
        return FlyerProductNames.fromBlocks(names, pageNumber);
    }

    @Override
    public List<ParsedProduct> extractFromLayout(List<TextRun> runs, int pageNumber) {
        return List.of();
    }

    private static String nameOf(String box) {
        List<String> parts = new ArrayList<>();
        for (String raw : box.split("\\R")) {
            String line = raw.trim();
            if (line.isEmpty()) {
                continue;
            }
            if (MARKETING.matcher(line).find()) {
                return null;
            }
            if (isNameLine(line)) {
                parts.add(line);
            } else if (!parts.isEmpty()) {
                break;
            }
        }
        if (parts.isEmpty()) {
            return null;
        }
        String name = String.join(" ", parts);
        return isHouseBrand(name) ? null : name;
    }

    private static boolean isHouseBrand(String name) {
        String key = HungarianText.normalize(FlyerProductNames.tidy(name))
                .replace('\u2019', '\'')
                .replace('\u2018', '\'');
        return HOUSE_BRANDS.contains(key);
    }

    private static boolean isNameLine(String line) {
        return isShouted(line) && !FlyerLayout.isPriceLike(line) && !isLetterSpaced(line);
    }

    private static boolean isShouted(String line) {
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
        return letters >= 4 && upper * 10 >= letters * 8;
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

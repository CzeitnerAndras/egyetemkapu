package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;
import com.egyetemkapu.service.FlyerCatalogParser.TextRun;
import com.egyetemkapu.service.HungarianText;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/*
Coop leaflets on katalogus.coop.hu are pictures. Publitas and the PDF have no text layer,
so names come from OCR words with positions. A product is the short stack of words sitting
on one offer; prices, units and the full-width slogans are not part of that stack.
 */
public class CoopFlyerExtractor extends GenericFlyerExtractor {

    private static final Pattern UNIT = Pattern.compile(
            "(?iu)^(?:ft|dkg|kg|db|ml|g|szuper|coop)[\\p{Punct}/\\d]*$");
    private static final Pattern NUMBER = Pattern.compile("^[\\d./,%+-]+$");
    private static final Pattern PROMO = Pattern.compile(
            "(?iu)frissen|finomat|olcs[oó]n|r[eé]gi[oó]nk|h[aá]zias|h[eé]tv[eé]gi|aj[aá]nlat"
                    + "|sp[oó]rolj|klub\\s*[aá]r|k[eé]szterm|v[aá]s[aá]r|[eé]rv[eé]ny"
                    + "|üzleteink|uzleteink|c[ií]moldal|szeptember|okt[oó]ber|november|december"
                    + "|db-os|b[oő]vebb|v[aá]laszt[eé]k");
    private static final Pattern LEGAL = Pattern.compile(
            "ertekesit|erveny|pultban|kiszerel|matrica|valasztek|oldalon|ajanlat|torzsvas|bovebb|finomat|reszlet|sporol|feltuntet|uzlet");
    private static final Pattern UNIT_PHRASE = Pattern.compile("(?iu)\\bft\\s*/\\s*[\\p{L}]+\\.?");
    private static final Set<String> DROPPED_WORDS = Set.of(
            "felzsiros", "zsiros", "sovany", "csont", "nelkul", "ervenyes", "kiszereles",
            "talcas", "vedogazas", "vedogazi", "t-dog");
    private static final Pattern FOOTNOTE = Pattern.compile(
            "tokehus|matric|megjel|fekunt|fekint|baromfi|vagott|www|coop\\.hu|ertekesit|pultban");
    private static final Pattern FLAVOR_ONLY = Pattern.compile(
            "^(?:citrom|csokolades|csokis|kokusz-afonya|kokusz afonya|tejkreames|fekete ribizli)(?: iz)?$");
    private static final int MAX_WORDS = 8;

    public CoopFlyerExtractor(FlyerCatalogParser parser) {
        super(parser);
    }

    @Override
    public String store() {
        return "coop";
    }

    @Override
    public List<ParsedProduct> extractFromPageText(String text, int pageNumber) {
        if (text == null || !HungarianText.normalize(text).contains("ft")) {
            return List.of();
        }
        List<String> blocks = new ArrayList<>();
        for (String rawLine : text.split("\\R")) {
            String line = rawLine.replaceAll("\\s+", " ").trim();
            if (line.isBlank() || isTextLayerNoise(line)) {
                continue;
            }
            String name = FlyerCatalogParser.tidyProductName(line);
            if (name.isBlank() || isTextLayerNoise(name) || FlyerCatalogParser.isJunkProductName(name)) {
                continue;
            }
            blocks.add(name);
        }
        return FlyerProductNames.fromBlocks(blocks, pageNumber);
    }

    @Override
    public List<ParsedProduct> extractFromLayout(List<TextRun> runs, int pageNumber) {
        if (runs == null || runs.isEmpty()) {
            return List.of();
        }
        return FlyerProductNames.fromBlocks(groupOffers(runs), pageNumber);
    }

    private static List<String> groupOffers(List<TextRun> runs) {
        List<TextRun> words = new ArrayList<>();
        for (TextRun run : runs) {
            if (run != null && run.text() != null && run.height() >= 10f && !isNoise(run.text())) {
                words.add(run);
            }
        }
        words = dropDisclaimerBands(words);
        int count = words.size();
        int[] parent = new int[count];
        int[] size = new int[count];
        for (int i = 0; i < count; i++) {
            parent[i] = i;
            size[i] = 1;
        }
        for (int i = 0; i < count; i++) {
            for (int j = i + 1; j < count; j++) {
                if (size[find(parent, i)] + size[find(parent, j)] <= MAX_WORDS && near(words.get(i), words.get(j))) {
                    union(parent, size, i, j);
                }
            }
        }
        Map<Integer, List<TextRun>> groups = new LinkedHashMap<>();
        for (int i = 0; i < count; i++) {
            groups.computeIfAbsent(find(parent, i), key -> new ArrayList<>()).add(words.get(i));
        }
        attachLoosePhrases(groups);
        List<String> blocks = new ArrayList<>();
        for (List<TextRun> group : groups.values()) {
            String text = polish(readingOrder(group));
            if (!text.isBlank() && !isAsideNoise(text)) {
                blocks.add(text);
            }
        }
        return blocks;
    }

    private static String readingOrder(List<TextRun> group) {
        List<TextRun> words = new ArrayList<>(group);
        words.sort(Comparator.comparingDouble(TextRun::y).thenComparingDouble(TextRun::x));
        List<List<TextRun>> lines = new ArrayList<>();
        for (TextRun word : words) {
            float lineHeight = lines.isEmpty()
                    ? word.height()
                    : Math.min(lines.get(lines.size() - 1).get(0).height(), word.height());
            if (lines.isEmpty() || word.y() - lines.get(lines.size() - 1).get(0).y() > 0.45f * Math.max(8f, lineHeight)) {
                lines.add(new ArrayList<>());
            }
            lines.get(lines.size() - 1).add(word);
        }
        StringBuilder name = new StringBuilder();
        for (List<TextRun> line : lines) {
            line.sort(Comparator.comparingDouble(TextRun::x));
            for (TextRun word : line) {
                if (!name.isEmpty()) {
                    name.append(' ');
                }
                name.append(word.text().trim());
            }
        }
        return UNIT_PHRASE.matcher(name.toString()).replaceAll(" ").replaceAll("\\s+", " ").trim();
    }

    private static void attachLoosePhrases(Map<Integer, List<TextRun>> groups) {
        List<Integer> phrases = new ArrayList<>();
        for (Map.Entry<Integer, List<TextRun>> entry : groups.entrySet()) {
            if ("tobb izben".equals(HungarianText.normalize(readingOrder(entry.getValue())))) {
                phrases.add(entry.getKey());
            }
        }
        for (Integer phraseKey : phrases) {
            List<TextRun> phrase = groups.get(phraseKey);
            if (phrase == null) {
                continue;
            }
            float phraseX = phrase.get(0).x();
            float phraseRight = phrase.get(0).right();
            float phraseY = phrase.get(0).y();
            for (TextRun word : phrase) {
                phraseX = Math.min(phraseX, word.x());
                phraseRight = Math.max(phraseRight, word.right());
                phraseY = Math.min(phraseY, word.y());
            }
            Integer hostKey = null;
            float bestGap = Float.MAX_VALUE;
            for (Map.Entry<Integer, List<TextRun>> entry : groups.entrySet()) {
                if (entry.getKey().equals(phraseKey) || entry.getValue().size() < 2) {
                    continue;
                }
                float minX = Float.MAX_VALUE;
                float maxRight = 0f;
                float bottom = 0f;
                for (TextRun word : entry.getValue()) {
                    minX = Math.min(minX, word.x());
                    maxRight = Math.max(maxRight, word.right());
                    bottom = Math.max(bottom, word.bottom());
                }
                float overlap = Math.min(maxRight, phraseRight) - Math.max(minX, phraseX);
                float gap = phraseY - bottom;
                if (overlap >= 8f && gap >= -8f && gap <= 80f && gap < bestGap) {
                    bestGap = gap;
                    hostKey = entry.getKey();
                }
            }
            if (hostKey != null) {
                groups.get(hostKey).addAll(phrase);
                groups.remove(phraseKey);
            }
        }
    }

    private static String polish(String text) {
        List<String> words = new ArrayList<>();
        for (String raw : text.split("\\s+")) {
            String word = raw.replaceAll("^[\"'(\\[-]+|[\"')\\],.:;!?]+$", "");
            if (word.isBlank()) {
                continue;
            }
            String key = HungarianText.normalize(word);
            if (key.equals("pidk")) {
                word = "Pick";
            } else if (key.equals("comer")) {
                word = "Corner";
            } else if (key.equals("jiaital")) {
                word = "energiaital";
            } else if (key.equals("uht") || key.equals("uhtt")) {
                word = "UHT";
            }
            key = HungarianText.normalize(word);
            if (DROPPED_WORDS.contains(key) || key.startsWith("vedogaz") || key.contains("gazas")
                    || key.contains("ereles")
                    || (key.length() < 4 && !key.equals("uht") && !key.equals("tej")
                    && (word.isEmpty() || !Character.isUpperCase(word.charAt(0))))) {
                continue;
            }
            boolean absorbed = false;
            for (String kept : words) {
                String keptKey = HungarianText.normalize(kept);
                if (keptKey.equals(key) || (key.length() >= 4 && keptKey.endsWith(key) && keptKey.length() > key.length())) {
                    absorbed = true;
                    break;
                }
            }
            if (!absorbed) {
                words.add(word);
            }
        }
        boolean product = false;
        for (String word : words) {
            String key = HungarianText.normalize(word);
            if (key.contains("ital") || key.contains("kolbasz") || key.contains("turo") || key.contains("tej")
                    || key.contains("wafers") || key.contains("mell") || key.contains("lapocka")) {
                product = true;
                break;
            }
        }
        if (product) {
            words.removeIf(word -> {
                String key = HungarianText.normalize(word);
                return key.contains("kokusz") || key.contains("citrom") || key.equals("iz") || key.equals("sajtos")
                        || key.contains("csokolade") || key.contains("tejkre");
            });
        }
        int uht = -1;
        int tej = -1;
        for (int i = 0; i < words.size(); i++) {
            String key = HungarianText.normalize(words.get(i));
            if (key.equals("uht")) {
                uht = i;
            } else if (key.equals("tej")) {
                tej = i;
            }
        }
        if (uht > tej && tej >= 0) {
            String marker = words.remove(uht);
            words.add(tej, marker);
        }
        return String.join(" ", words).replaceAll("\\s+", " ").trim();
    }

    private static List<TextRun> dropDisclaimerBands(List<TextRun> words) {
        Map<Integer, List<TextRun>> lines = new LinkedHashMap<>();
        for (TextRun word : words) {
            lines.computeIfAbsent(Math.round(word.y() / 8f), key -> new ArrayList<>()).add(word);
        }
        Set<TextRun> drop = new HashSet<>();
        for (List<TextRun> line : lines.values()) {
            if (line.size() < 5) {
                continue;
            }
            float minX = Float.MAX_VALUE;
            float maxRight = 0f;
            for (TextRun word : line) {
                minX = Math.min(minX, word.x());
                maxRight = Math.max(maxRight, word.right());
            }
            if (maxRight - minX >= 480f) {
                drop.addAll(line);
            }
        }
        if (drop.isEmpty()) {
            return words;
        }
        List<TextRun> kept = new ArrayList<>();
        for (TextRun word : words) {
            if (!drop.contains(word)) {
                kept.add(word);
            }
        }
        return kept;
    }

    private static boolean isAsideNoise(String text) {
        String key = HungarianText.normalize(text);
        if (key.isBlank() || LEGAL.matcher(key).find() || FOOTNOTE.matcher(key).find()
                || FLAVOR_ONLY.matcher(key).matches() || PROMO.matcher(text).find() || key.contains("ft/")) {
            return true;
        }
        if ((key.contains("plusz") || key.contains("mozzarella") || key.contains("paradicsom"))
                && !key.contains("kolbasz") && !key.contains("parizsi") && !key.contains("pizza")) {
            return true;
        }
        boolean anyLower = false;
        for (int i = 0; i < text.length(); i++) {
            char character = text.charAt(i);
            if (Character.isLetter(character) && Character.isLowerCase(character)) {
                anyLower = true;
                break;
            }
        }
        if (!anyLower) {
            return true;
        }
        return text.split("\\s+").length < 2;
    }

    private static boolean near(TextRun first, TextRun second) {
        float height = Math.max(8f, Math.min(first.height(), second.height()));
        TextRun left = first.x() <= second.x() ? first : second;
        TextRun right = left == first ? second : first;
        float horizontalGap = right.x() - left.right();
        if (Math.abs(first.y() - second.y()) <= 0.6f * height
                && horizontalGap >= -0.4f * height
                && horizontalGap <= 2.2f * height) {
            return true;
        }
        TextRun upper = first.y() <= second.y() ? first : second;
        TextRun lower = upper == first ? second : first;
        float lineSpacing = lower.y() - upper.y();
        if (lineSpacing < 0.35f * height || lineSpacing > 3.2f * height) {
            return false;
        }
        float overlap = Math.min(first.right(), second.right()) - Math.max(first.x(), second.x());
        if (overlap >= 0.2f * Math.min(first.width(), second.width())) {
            return true;
        }
        return Math.abs(first.x() - second.x()) <= 0.8f * height;
    }

    private static int find(int[] parent, int index) {
        int root = index;
        while (parent[root] != root) {
            root = parent[root];
        }
        while (parent[index] != root) {
            int next = parent[index];
            parent[index] = root;
            index = next;
        }
        return root;
    }

    private static void union(int[] parent, int[] size, int left, int right) {
        int leftRoot = find(parent, left);
        int rightRoot = find(parent, right);
        if (leftRoot == rightRoot) {
            return;
        }
        if (size[leftRoot] < size[rightRoot]) {
            int swap = leftRoot;
            leftRoot = rightRoot;
            rightRoot = swap;
        }
        parent[rightRoot] = leftRoot;
        size[leftRoot] += size[rightRoot];
    }

    private static boolean isTextLayerNoise(String raw) {
        String text = raw == null ? "" : raw.replaceAll("\\s+", " ").trim();
        if (text.isBlank() || isNoise(text.replace(",", " ")) || isUnitPhrase(text) || isShouted(text)) {
            return true;
        }
        String key = HungarianText.normalize(text);
        return key.contains("jo szomszed") || key.contains("uzletlanc");
    }

    private static boolean isUnitPhrase(String text) {
        String key = HungarianText.normalize(text).replaceAll("[^\\p{L}\\s]", " ").replaceAll("\\s+", " ").trim();
        if (key.isBlank()) {
            return true;
        }
        for (String word : key.split(" ")) {
            if (!word.matches("ft|dkg|kg|db|ml|g|l|szuper")) {
                return false;
            }
        }
        return true;
    }

    private static boolean isShouted(String text) {
        boolean letter = false;
        for (int i = 0; i < text.length(); i++) {
            char character = text.charAt(i);
            if (!Character.isLetter(character)) {
                continue;
            }
            letter = true;
            if (Character.isLowerCase(character)) {
                return false;
            }
        }
        return letter;
    }

    static boolean isNoise(String raw) {
        String text = raw == null ? "" : raw.replaceAll("\\s+", " ").trim();
        if (text.isBlank() || text.indexOf(',') >= 0
                || NUMBER.matcher(text).matches() || UNIT.matcher(text).matches()) {
            return true;
        }
        if (FlyerLayout.isPriceLike(text) || PROMO.matcher(text).find()
                || LEGAL.matcher(HungarianText.normalize(text)).find()) {
            return true;
        }
        int letters = 0;
        for (int i = 0; i < text.length(); i++) {
            if (Character.isLetter(text.charAt(i))) {
                letters++;
            }
        }
        return letters < 3;
    }
}

package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;
import com.egyetemkapu.service.FlyerCatalogParser.TextRun;
import com.egyetemkapu.service.HungarianText;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

public final class RossmannPrintedNames {

    private static final Pattern PRICE = Pattern.compile("^\\d{3,6}(?:\\s*Ft)?$");
    private static final Pattern SIZE = Pattern.compile(
            "(?iu)^(?:többféle\\.?|\\d+(?:[.,]\\d+)?\\s*(?:ml|g|kg|l|db|Ft).*|\\d+\\s*/\\s*\\d+.*)$");
    private static final Pattern ARTICLE = Pattern.compile("^\\d{5,7}$");
    private static final Pattern CONNECTOR = Pattern.compile("(?iu)^(?:vagy|és)$");

    private RossmannPrintedNames() {
    }

    public static List<ParsedProduct> read(List<TextRun> runs, int pageNumber) {
        if (runs == null || runs.isEmpty() || pageNumber < 1) {
            return List.of();
        }
        List<TextRun> lines = lines(runs);
        boolean boldNames = lines.stream().anyMatch(RossmannPrintedNames::boldNameFont);
        List<Offer> offers = new ArrayList<>();
        for (TextRun price : lines) {
            if (!isShelfPrice(price)) {
                continue;
            }
            String name = nameAbove(lines, price, boldNames);
            if (name.isBlank()) {
                continue;
            }
            offers.add(new Offer(price.y(), price.x(), name));
        }
        offers.sort(Comparator.comparingDouble(Offer::y).thenComparingDouble(Offer::x));
        Map<String, ParsedProduct> unique = new LinkedHashMap<>();
        for (Offer offer : offers) {
            unique.putIfAbsent(HungarianText.normalize(offer.name()), new ParsedProduct(offer.name(), pageNumber, null));
        }
        return List.copyOf(unique.values());
    }

    private static String nameAbove(List<TextRun> lines, TextRun price, boolean boldNames) {
        List<TextRun> parts = new ArrayList<>();
        float cursor = price.y();
        boolean started = false;
        List<TextRun> above = new ArrayList<>();
        for (TextRun line : lines) {
            if (line.y() < price.y() - 0.4f && sameCard(line, price)) {
                above.add(line);
            }
        }
        above.sort(Comparator.comparingDouble(TextRun::y).reversed().thenComparingDouble(TextRun::x));
        for (TextRun line : above) {
            float gap = cursor - line.bottom();
            if (gap > 22f || (isShelfPrice(line) && Math.abs(line.x() - price.x()) <= 45f)) {
                break;
            }
            if (line.fontSize() < 6f || isNoise(line)) {
                cursor = line.y();
                continue;
            }
            if (boldNames && !boldNameFont(line) && !connector(line)) {
                if (started) {
                    break;
                }
                cursor = line.y();
                continue;
            }
            if (line.fontSize() > 14f || line.fontSize() < 6f) {
                if (started) {
                    break;
                }
                cursor = line.y();
                continue;
            }
            parts.add(line);
            started = true;
            cursor = line.y();
        }
        if (parts.isEmpty()) {
            return "";
        }
        parts.sort(Comparator.comparingDouble(TextRun::y).thenComparingDouble(TextRun::x));
        StringBuilder name = new StringBuilder();
        for (TextRun part : parts) {
            String token = part.text().trim();
            if (name.isEmpty()) {
                name.append(token);
            } else if (token.equals("+")) {
                name.append('+');
            } else {
                name.append(' ').append(token);
            }
        }
        return clean(name.toString());
    }

    private static List<TextRun> lines(List<TextRun> runs) {
        List<TextRun> sorted = new ArrayList<>();
        for (TextRun run : runs) {
            if (run == null || run.text() == null || run.text().isBlank() || !useful(run.text())) {
                continue;
            }
            sorted.add(run);
        }
        sorted.sort(Comparator.comparingDouble(TextRun::y).thenComparingDouble(TextRun::x));
        List<TextRun> lines = new ArrayList<>();
        for (TextRun run : sorted) {
            TextRun previous = lines.isEmpty() ? null : lines.getLast();
            if (previous != null && continues(previous, run)) {
                lines.set(lines.size() - 1, join(previous, run));
            } else {
                lines.add(run);
            }
        }
        return lines;
    }

    private static boolean continues(TextRun left, TextRun right) {
        if (isShelfPrice(left) || isShelfPrice(right)) {
            return false;
        }
        if (right.text().trim().matches("[1-3]")) {
            return false;
        }
        if (boldNameFont(left) != boldNameFont(right) && !right.text().trim().equals("+")) {
            return false;
        }
        if (Math.abs(right.y() - left.y()) > 1.6f) {
            return false;
        }
        float gap = right.x() - left.right();
        float limit = Math.max(4f, left.fontSize() * 0.45f);
        return gap >= -1f && gap <= limit;
    }

    private static TextRun join(TextRun left, TextRun right) {
        float y = Math.min(left.y(), right.y());
        String text = left.text().trim() + (right.text().trim().equals("+") ? "+" : " " + right.text().trim());
        return new TextRun(
                left.x(),
                y,
                Math.max(left.right(), right.right()) - left.x(),
                Math.max(left.bottom(), right.bottom()) - y,
                text,
                left.font(),
                Math.max(left.fontSize(), right.fontSize()));
    }

    private static boolean sameCard(TextRun line, TextRun price) {
        return line.x() >= price.x() - 80f && line.x() <= price.x() + 40f;
    }

    private static boolean isShelfPrice(TextRun line) {
        if (line.fontSize() < 15f || line.fontSize() > 31f) {
            return false;
        }
        if (line.font() != null && line.font().toLowerCase(Locale.ROOT).contains("script")) {
            return false;
        }
        return PRICE.matcher(line.text().trim()).matches();
    }

    private static boolean isNoise(TextRun line) {
        String text = line.text().trim();
        String lower = text.toLowerCase(Locale.ROOT);
        if (text.length() == 1 || text.equalsIgnoreCase("az")) {
            return true;
        }
        return lower.startsWith("rossmann")
                || lower.startsWith("tagok")
                || lower.contains("kedvezmény")
                || lower.startsWith("többféle")
                || lower.equals("ft")
                || ARTICLE.matcher(text).matches()
                || SIZE.matcher(text).matches()
                || PRICE.matcher(text).matches()
                || text.matches("^\\d{1,2}\\s*%?$");
    }

    private static boolean boldNameFont(TextRun line) {
        String font = line.font() == null ? "" : line.font().toLowerCase(Locale.ROOT);
        return font.contains("black");
    }

    private static boolean connector(TextRun line) {
        return CONNECTOR.matcher(line.text().trim()).matches();
    }

    private static boolean useful(String text) {
        String trimmed = text.trim();
        if (trimmed.equals("+")) {
            return true;
        }
        return trimmed.codePoints().anyMatch(code -> Character.isLetter(code) || Character.isDigit(code));
    }

    private static String clean(String raw) {
        String name = raw.replace('\u00ad', ' ')
                .replaceAll("(?<=\\p{L})[1-3](?=\\s|$)", "")
                .replaceAll("\\s*\\*+$", "")
                .replaceAll("\\s+", " ")
                .replaceAll("^[\\s\\-–]+|[\\s\\-–]+$", "")
                .trim();
        if (name.length() < 4 || !name.codePoints().anyMatch(Character::isLetter)) {
            return "";
        }
        String lower = name.toLowerCase(Locale.ROOT);
        if (lower.contains("kedvezmény") || lower.contains("legjobb") || lower.startsWith("érvényes")) {
            return "";
        }
        return name;
    }

    private record Offer(float y, float x, String name) {
    }
}

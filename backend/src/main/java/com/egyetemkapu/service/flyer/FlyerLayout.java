package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser.TextRun;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.function.Predicate;
import java.util.regex.Pattern;

final class FlyerLayout {

    private static final Pattern SUBSET_PREFIX = Pattern.compile("^[A-Z]{6}\\+");
    private static final Pattern PRICE = Pattern.compile("(?iu)\\d[\\d\\s.,/]*\\s*Ft\\b");
    private static final Pattern DISCOUNT = Pattern.compile("^[-+\u2013\u2014]?\\s*\\d{1,3}\\s*%$");
    private static final Pattern UNIT_ONLY = Pattern.compile(
            "(?iu)^[+\\-\u2013\u2014]?\\s*(?:Ft|Ft\\s*/\\s*[\\p{L}0-9]+|/\\s*[\\p{L}0-9]+)$");
    private static final Pattern FOOTNOTE = Pattern.compile("^[*\u2020\u00b9\u00b2\u00b3]");
    private static final Pattern LIGATURE = Pattern.compile("(?u)(ffi|ffl|ff|fi|fl) (?=\\p{Ll})");

    private FlyerLayout() {
    }

    static String baseFont(String font) {
        return font == null ? "" : SUBSET_PREFIX.matcher(font).replaceFirst("");
    }

    static boolean fontEndsWith(TextRun run, String... suffixes) {
        String font = baseFont(run.font());
        for (String suffix : suffixes) {
            if (font.endsWith(suffix)) {
                return true;
            }
        }
        return false;
    }

    static boolean isPriceLike(String text) {
        String trimmed = text == null ? "" : text.trim();
        return !trimmed.isEmpty()
                && (PRICE.matcher(trimmed).find()
                        || DISCOUNT.matcher(trimmed).matches()
                        || UNIT_ONLY.matcher(trimmed).matches());
    }

    static boolean isFootnote(String text) {
        return text != null && FOOTNOTE.matcher(text.trim()).find();
    }

    static String repairLigatures(String text) {
        return text == null ? "" : LIGATURE.matcher(text).replaceAll("$1");
    }

    static List<String> nameBlocks(List<TextRun> runs, Predicate<TextRun> isNameLine) {
        List<TextRun> candidates = new ArrayList<>();
        for (TextRun run : mergeLines(runs)) {
            if (run.text().isBlank() || isPriceLike(run.text()) || !isNameLine.test(run)) {
                continue;
            }
            candidates.add(run);
        }
        candidates.sort(Comparator.comparingDouble(TextRun::y).thenComparingDouble(TextRun::x));
        boolean[] taken = new boolean[candidates.size()];
        List<String> names = new ArrayList<>();
        for (int i = 0; i < candidates.size(); i++) {
            if (taken[i]) {
                continue;
            }
            taken[i] = true;
            TextRun current = candidates.get(i);
            StringBuilder name = new StringBuilder(current.text());
            for (int next = nextLine(candidates, taken, current); next >= 0;
                 next = nextLine(candidates, taken, current)) {
                taken[next] = true;
                current = candidates.get(next);
                name.append(' ').append(current.text());
            }
            names.add(repairLigatures(name.toString()));
        }
        return names;
    }

    private static int nextLine(List<TextRun> candidates, boolean[] taken, TextRun current) {
        int best = -1;
        for (int i = 0; i < candidates.size(); i++) {
            if (taken[i]) {
                continue;
            }
            TextRun candidate = candidates.get(i);
            if (candidate.y() <= current.y() || !sameStyle(current, candidate) || !stacked(current, candidate)
                    || !aligned(current, candidate)) {
                continue;
            }
            if (best < 0 || candidate.y() < candidates.get(best).y()) {
                best = i;
            }
        }
        return best;
    }

    private static boolean sameStyle(TextRun first, TextRun second) {
        return baseFont(first.font()).equals(baseFont(second.font()))
                && Math.abs(first.fontSize() - second.fontSize()) <= 0.4f;
    }

    private static boolean stacked(TextRun above, TextRun below) {
        float size = Math.max(above.fontSize(), 1f);
        float gap = below.y() - above.bottom();
        return gap >= -0.4f * size && gap <= 0.95f * size;
    }

    private static boolean aligned(TextRun first, TextRun second) {
        float tolerance = Math.max(2f, 0.3f * Math.max(first.fontSize(), 1f));
        return Math.abs(first.x() - second.x()) <= tolerance
                || Math.abs(first.right() - second.right()) <= tolerance
                || Math.abs(first.centerX() - second.centerX()) <= tolerance;
    }

    private static List<TextRun> mergeLines(List<TextRun> runs) {
        if (runs == null || runs.isEmpty()) {
            return List.of();
        }
        List<TextRun> sorted = new ArrayList<>(runs);
        sorted.sort(Comparator.comparingDouble(TextRun::y).thenComparingDouble(TextRun::x));
        List<TextRun> merged = new ArrayList<>();
        for (TextRun run : sorted) {
            TextRun previous = merged.isEmpty() ? null : merged.getLast();
            if (previous != null && continuesLine(previous, run)) {
                merged.set(merged.size() - 1, join(previous, run));
            } else {
                merged.add(run);
            }
        }
        return merged;
    }

    private static boolean continuesLine(TextRun left, TextRun right) {
        if (!sameStyle(left, right)) {
            return false;
        }
        float size = Math.max(left.fontSize(), 1f);
        float gap = right.x() - left.right();
        return Math.abs(right.y() - left.y()) <= 0.3f * size && gap >= -0.5f && gap <= 0.6f * size;
    }

    private static TextRun join(TextRun left, TextRun right) {
        float y = Math.min(left.y(), right.y());
        return new TextRun(
                left.x(),
                y,
                Math.max(left.right(), right.right()) - left.x(),
                Math.max(left.bottom(), right.bottom()) - y,
                left.text() + " " + right.text(),
                left.font(),
                left.fontSize());
    }
}

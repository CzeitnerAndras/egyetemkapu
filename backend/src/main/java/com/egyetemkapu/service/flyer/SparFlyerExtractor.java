package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;
import com.egyetemkapu.service.FlyerCatalogParser.TextRun;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/*
    SPAR prints product names in Poppins Bold/SemiBold. Shelf names are about 8pt and the cover heroes are 13pt.
    Descriptions are Poppins Regular, prices ExtraBold and headlines Black, so the weight plus that size band
    picks out the names. Blocks are right-aligned as often as they are left-aligned, which is why the shared
    layout reader matches on either edge. Artwork that sits outside the page box is bleed, not a product.
 */
public class SparFlyerExtractor extends GenericFlyerExtractor {

    private static final float MIN_SIZE = 7.5f;
    private static final float MAX_SIZE = 13.5f;

    public SparFlyerExtractor(FlyerCatalogParser parser) {
        super(parser);
    }

    @Override
    public String store() {
        return "spar";
    }

    @Override
    public List<ParsedProduct> extractFromLayout(List<TextRun> runs, int pageNumber) {
        List<TextRun> visible = new ArrayList<>();
        if (runs != null) {
            for (TextRun run : runs) {
                if (onPage(run)) {
                    visible.add(run);
                }
            }
        }
        return FlyerProductNames.fromBlocks(
                FlyerLayout.nameBlocks(joinCurvedLabels(visible), SparFlyerExtractor::isNameLine), pageNumber);
    }

    @Override
    public List<ParsedProduct> extractFromPageText(String text, int pageNumber) {
        return List.of();
    }

    private static boolean isNameLine(TextRun run) {
        return FlyerLayout.fontEndsWith(run, "-Bold", "-SemiBold")
                && run.fontSize() >= MIN_SIZE
                && run.fontSize() <= MAX_SIZE
                && !FlyerLayout.isFootnote(run.text());
    }

    private static boolean onPage(TextRun run) {
        return run != null
                && run.right() > 1f
                && run.x() < 620f
                && run.bottom() > 1f
                && run.y() < 840f;
    }

    /*
        Badges such as KEDVEZMÉNY are set on an arc, one syllable per baseline. Glue those
        capitals back into one word so the slogan filter can drop them, and leave a real
        two-letter brand such as BB alone.
     */
    private static List<TextRun> joinCurvedLabels(List<TextRun> runs) {
        List<TextRun> pending = new ArrayList<>(runs);
        pending.sort(Comparator.comparingDouble(TextRun::x).thenComparingDouble(TextRun::y));
        boolean[] used = new boolean[pending.size()];
        List<TextRun> joined = new ArrayList<>();
        for (int i = 0; i < pending.size(); i++) {
            if (used[i]) {
                continue;
            }
            TextRun current = pending.get(i);
            used[i] = true;
            boolean extended = true;
            while (extended) {
                extended = false;
                int nearest = nearestCapsFragment(pending, used, current);
                if (nearest >= 0 && curvedContinuation(current, pending.get(nearest))) {
                    used[nearest] = true;
                    current = joinFragments(current, pending.get(nearest));
                    extended = true;
                }
            }
            joined.add(current);
        }
        return joined;
    }

    private static int nearestCapsFragment(List<TextRun> pending, boolean[] used, TextRun current) {
        int nearest = -1;
        float nearestX = Float.MAX_VALUE;
        for (int j = 0; j < pending.size(); j++) {
            TextRun candidate = pending.get(j);
            if (used[j] || candidate == current || !capsFragment(candidate)) {
                continue;
            }
            if (candidate.x() + 1.5f < current.right()) {
                continue;
            }
            if (candidate.x() < nearestX) {
                nearestX = candidate.x();
                nearest = j;
            }
        }
        return nearest;
    }

    private static boolean curvedContinuation(TextRun left, TextRun right) {
        if (!capsLabel(left) || !capsFragment(right) || !sameFace(left, right)) {
            return false;
        }
        float size = Math.max(left.fontSize(), 1f);
        float gap = right.x() - left.right();
        float drift = Math.abs(right.y() - left.y());
        return gap >= -1.5f && gap <= 0.9f * size && drift >= 0.08f * size && drift <= 0.75f * size;
    }

    private static boolean capsLabel(TextRun run) {
        String text = lettersOnly(run);
        return text != null && text.length() <= 24 && text.equals(text.toUpperCase(Locale.ROOT));
    }

    private static boolean capsFragment(TextRun run) {
        String text = lettersOnly(run);
        return text != null && text.length() <= 6 && text.equals(text.toUpperCase(Locale.ROOT));
    }

    private static String lettersOnly(TextRun run) {
        if (run == null || run.text() == null) {
            return null;
        }
        String text = run.text().trim();
        if (text.isEmpty() || !text.codePoints().allMatch(Character::isLetter)) {
            return null;
        }
        return text;
    }

    private static boolean sameFace(TextRun left, TextRun right) {
        return baseFont(left.font()).equals(baseFont(right.font()))
                && Math.abs(left.fontSize() - right.fontSize()) <= 0.4f;
    }

    private static String baseFont(String font) {
        return font == null ? "" : font.replaceFirst("^[A-Z]{6}\\+", "");
    }

    private static TextRun joinFragments(TextRun left, TextRun right) {
        float x = Math.min(left.x(), right.x());
        return new TextRun(
                x,
                right.y(),
                Math.max(left.right(), right.right()) - x,
                Math.max(left.height(), right.height()),
                left.text() + right.text(),
                left.font(),
                left.fontSize());
    }
}

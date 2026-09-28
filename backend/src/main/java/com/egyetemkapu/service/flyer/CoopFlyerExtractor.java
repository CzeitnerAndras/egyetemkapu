package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;
import com.egyetemkapu.service.FlyerCatalogParser.TextRun;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
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
                    + "|db-os");

    public CoopFlyerExtractor(FlyerCatalogParser parser) {
        super(parser);
    }

    @Override
    public String store() {
        return "coop";
    }

    @Override
    public List<ParsedProduct> extractFromLayout(List<TextRun> runs, int pageNumber) {
        if (runs == null || runs.isEmpty()) {
            return List.of();
        }
        return FlyerProductNames.fromBlocks(stack(mergeLines(runs)), pageNumber);
    }

    private static List<TextRun> mergeLines(List<TextRun> runs) {
        List<TextRun> sorted = new ArrayList<>();
        for (TextRun run : runs) {
            if (run != null && run.text() != null && !isNoise(run.text())) {
                sorted.add(run);
            }
        }
        sorted.sort(Comparator.comparingDouble(TextRun::y).thenComparingDouble(TextRun::x));
        List<TextRun> lines = new ArrayList<>();
        TextRun current = null;
        for (TextRun run : sorted) {
            if (current == null) {
                current = run;
                continue;
            }
            float height = Math.max(current.height(), 8f);
            boolean sameLine = Math.abs(run.y() - current.y()) <= Math.max(4f, 0.45f * height);
            float gap = run.x() - current.right();
            if (sameLine && gap >= -4f && gap <= Math.max(14f, 0.8f * height)) {
                float right = Math.max(current.right(), run.right());
                float bottom = Math.max(current.bottom(), run.bottom());
                current = new TextRun(
                        current.x(),
                        Math.min(current.y(), run.y()),
                        right - current.x(),
                        bottom - Math.min(current.y(), run.y()),
                        current.text().trim() + " " + run.text().trim());
            } else {
                lines.add(current);
                current = run;
            }
        }
        if (current != null) {
            lines.add(current);
        }
        return lines;
    }

    private static List<String> stack(List<TextRun> lines) {
        List<TextRun> sorted = new ArrayList<>(lines);
        sorted.sort(Comparator.comparingDouble(TextRun::y).thenComparingDouble(TextRun::x));
        List<List<TextRun>> columns = new ArrayList<>();
        for (TextRun line : sorted) {
            List<TextRun> column = null;
            for (List<TextRun> candidate : columns) {
                if (continues(candidate.getLast(), line, candidate.size())) {
                    column = candidate;
                    break;
                }
            }
            if (column == null) {
                column = new ArrayList<>();
                columns.add(column);
            }
            column.add(line);
        }
        List<String> blocks = new ArrayList<>();
        for (List<TextRun> column : columns) {
            addBlock(blocks, column);
        }
        return blocks;
    }

    private static boolean continues(TextRun above, TextRun below, int linesSoFar) {
        if (linesSoFar >= 4) {
            return false;
        }
        float height = Math.max(above.height(), 8f);
        float gap = below.y() - above.bottom();
        if (gap < -2f || gap > 1.8f * height) {
            return false;
        }
        float overlap = Math.min(above.right(), below.right()) - Math.max(above.x(), below.x());
        return overlap >= Math.min(above.width(), below.width()) * 0.35f;
    }

    private static void addBlock(List<String> blocks, List<TextRun> stack) {
        if (stack.isEmpty()) {
            return;
        }
        StringBuilder name = new StringBuilder();
        for (TextRun line : stack) {
            if (!name.isEmpty()) {
                name.append(' ');
            }
            name.append(line.text().trim());
        }
        String text = name.toString().replaceAll("\\s+", " ").trim();
        if (!text.isBlank() && !PROMO.matcher(text).find()) {
            blocks.add(text);
        }
    }

    static boolean isNoise(String raw) {
        String text = raw == null ? "" : raw.replaceAll("\\s+", " ").trim();
        if (text.isBlank() || text.indexOf(',') >= 0
                || NUMBER.matcher(text).matches() || UNIT.matcher(text).matches()) {
            return true;
        }
        if (FlyerLayout.isPriceLike(text) || PROMO.matcher(text).find()) {
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

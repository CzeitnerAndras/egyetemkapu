package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;
import com.egyetemkapu.service.FlyerCatalogParser.TextRun;

import java.util.ArrayList;
import java.util.List;

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
                FlyerLayout.nameBlocks(visible, SparFlyerExtractor::isNameLine), pageNumber);
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
}

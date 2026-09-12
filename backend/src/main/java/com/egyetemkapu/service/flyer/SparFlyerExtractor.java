package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;
import com.egyetemkapu.service.FlyerCatalogParser.TextRun;

import java.util.List;

/*
SPAR prints product names in Poppins Bold/SemiBold at 8-12pt, descriptions in Poppins Regular, prices in Poppins ExtraBold and headlines in Poppins Black.
So the cut plus the size band picks out the names. The blocks are right-aligned as often as they are left-aligned, 
which is why the shared layout reader matches on either edge.
 */
public class SparFlyerExtractor extends GenericFlyerExtractor {

    private static final float MIN_SIZE = 7.5f;
    private static final float MAX_SIZE = 12.5f;

    public SparFlyerExtractor(FlyerCatalogParser parser) {
        super(parser);
    }

    @Override
    public String store() {
        return "spar";
    }

    @Override
    public List<ParsedProduct> extractFromLayout(List<TextRun> runs, int pageNumber) {
        return FlyerProductNames.fromBlocks(
                FlyerLayout.nameBlocks(runs, SparFlyerExtractor::isNameLine), pageNumber);
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
}

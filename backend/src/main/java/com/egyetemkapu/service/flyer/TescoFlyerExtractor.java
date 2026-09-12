package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;
import com.egyetemkapu.service.FlyerCatalogParser.TextRun;

import java.util.List;

/*
Tesco sets every product name in TESCOModern-Bold at body size 
and everything else around it (pack size, unit price, store exclusions, coupon terms) in the Light, Medium or Regular cut, 
so the typeface alone separates the names from the noise. 
Bold is also used for prices and headlines, but only at much larger sizes.
 */
public class TescoFlyerExtractor extends GenericFlyerExtractor {

    private static final float MIN_SIZE = 6.6f;
    private static final float MAX_SIZE = 8.5f;

    public TescoFlyerExtractor(FlyerCatalogParser parser) {
        super(parser);
    }

    @Override
    public String store() {
        return "tesco";
    }

    @Override
    public List<ParsedProduct> extractFromLayout(List<TextRun> runs, int pageNumber) {
        return FlyerProductNames.fromBlocks(
                FlyerLayout.nameBlocks(runs, TescoFlyerExtractor::isNameLine), pageNumber);
    }

    @Override
    public List<ParsedProduct> extractFromPageText(String text, int pageNumber) {
        return List.of();
    }

    private static boolean isNameLine(TextRun run) {
        return FlyerLayout.fontEndsWith(run, "-Bold")
                && run.fontSize() >= MIN_SIZE
                && run.fontSize() <= MAX_SIZE
                && !FlyerLayout.isFootnote(run.text());
    }
}

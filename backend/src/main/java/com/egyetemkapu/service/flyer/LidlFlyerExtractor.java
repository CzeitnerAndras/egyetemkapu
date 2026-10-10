package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;
import com.egyetemkapu.service.FlyerCatalogParser.TextRun;

import java.util.List;

/*
Lidl sets the offer name in LidlFontCondPro-Bold, around 8–10pt, with the brand on its own line
above the product. Pack size, unit price and the legal footer are Cond Regular, the forint price
is LidlFontPrice, and headlines such as dates and "Szuper ár" are LidlFontPro-Bold.
The condensed bold cut is therefore the product, and a line that ends in an exclamation mark is a slogan.
 */
public class LidlFlyerExtractor extends GenericFlyerExtractor {

    private static final float MIN_SIZE = 7.5f;
    private static final float MAX_SIZE = 12.5f;

    public LidlFlyerExtractor(FlyerCatalogParser parser) {
        super(parser);
    }

    @Override
    public String store() {
        return "lidl";
    }

    @Override
    public List<ParsedProduct> extractFromLayout(List<TextRun> runs, int pageNumber) {
        return FlyerProductNames.fromBlocks(
                FlyerLayout.nameBlocks(runs, LidlFlyerExtractor::isNameLine), pageNumber);
    }

    @Override
    public List<ParsedProduct> extractFromPageText(String text, int pageNumber) {
        return List.of();
    }

    private static boolean isNameLine(TextRun run) {
        return FlyerLayout.fontEndsWith(run, "LidlFontCondPro-Bold")
                && run.fontSize() >= MIN_SIZE
                && run.fontSize() <= MAX_SIZE
                && !FlyerLayout.isFootnote(run.text())
                && !FlyerLayout.isPriceLike(run.text());
    }
}

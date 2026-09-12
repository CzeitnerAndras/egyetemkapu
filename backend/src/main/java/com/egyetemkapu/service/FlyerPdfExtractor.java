package com.egyetemkapu.service;

import com.egyetemkapu.service.flyer.FlyerProductExtractor;
import com.egyetemkapu.service.flyer.GenericFlyerExtractor;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
public class FlyerPdfExtractor {

    private final FlyerCatalogParser parser = new FlyerCatalogParser();
    private final FlyerProductExtractor generic = new GenericFlyerExtractor(parser);

    public record ExtractedDocument(
            List<FlyerCatalogParser.ParsedPage> pages,
            List<FlyerCatalogParser.ParsedProduct> products) {
    }

    public List<FlyerCatalogParser.ParsedPage> extractPages(byte[] pdfBytes) {
        return extractDocument(pdfBytes, generic).pages();
    }

    public List<FlyerCatalogParser.ParsedPage> extractPages(byte[] pdfBytes, FlyerProductExtractor extractor) {
        return extractDocument(pdfBytes, extractor).pages();
    }

    public ExtractedDocument extractDocument(byte[] pdfBytes, FlyerProductExtractor extractor) {
        if (pdfBytes == null || pdfBytes.length == 0) {
            return new ExtractedDocument(List.of(), List.of());
        }
        FlyerProductExtractor active = extractor == null ? generic : extractor;
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            LayoutStripper stripper = new LayoutStripper();
            List<FlyerCatalogParser.ParsedPage> pages = new ArrayList<>();
            List<FlyerCatalogParser.ParsedProduct> products = new ArrayList<>();
            for (int i = 1; i <= document.getNumberOfPages(); i++) {
                stripper.setStartPage(i);
                stripper.setEndPage(i);
                stripper.clearRuns();
                String raw = stripper.getText(document);
                String text = raw == null ? "" : raw.trim();
                List<FlyerCatalogParser.ParsedProduct> pageProducts = active.extractFromLayout(stripper.runs(), i);
                if (pageProducts.isEmpty()) {
                    pageProducts = active.extractFromPageText(text, i);
                }
                pages.add(new FlyerCatalogParser.ParsedPage(i, null, text));
                products.addAll(pageProducts);
            }
            return new ExtractedDocument(pages, products);
        } catch (Exception e) {
            return new ExtractedDocument(List.of(), List.of());
        }
    }

    public byte[] renderPagePng(byte[] pdfBytes, int pageNumber) {
        if (pdfBytes == null || pdfBytes.length == 0 || pageNumber < 1) {
            return new byte[0];
        }
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            if (pageNumber > document.getNumberOfPages()) {
                return new byte[0];
            }
            PDFRenderer renderer = new PDFRenderer(document);
            BufferedImage image = renderer.renderImageWithDPI(pageNumber - 1, 120);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(image, "png", out);
            return out.toByteArray();
        } catch (Exception e) {
            return new byte[0];
        }
    }

    /**
     * Collects text runs that never mix fonts. Flyers set product names in a heavier face than the
     * descriptions and legal notes printed right underneath them, so keeping the face intact is what
     * lets the per-store extractors tell a name apart from the fine print around it.
     */
    private static final class LayoutStripper extends PDFTextStripper {
        private final List<FlyerCatalogParser.TextRun> runs = new ArrayList<>();

        private LayoutStripper() throws IOException {
            setSortByPosition(false);
        }

        private void clearRuns() {
            runs.clear();
        }

        private List<FlyerCatalogParser.TextRun> runs() {
            return runs;
        }

        @Override
        protected void writeString(String string, List<TextPosition> textPositions) throws IOException {
            if (textPositions != null && !textPositions.isEmpty()) {
                List<TextPosition> current = new ArrayList<>();
                TextPosition previous = null;
                for (TextPosition position : textPositions) {
                    if (previous != null && breaksRun(previous, position)) {
                        addRun(current);
                        current = new ArrayList<>();
                    }
                    current.add(position);
                    previous = position;
                }
                addRun(current);
            }
            super.writeString(string, textPositions);
        }

        private void addRun(List<TextPosition> positions) {
            if (positions.isEmpty()) {
                return;
            }
            float minX = Float.MAX_VALUE;
            float minY = Float.MAX_VALUE;
            float maxX = 0;
            float maxY = 0;
            float size = 0;
            StringBuilder text = new StringBuilder();
            TextPosition previous = null;
            for (TextPosition position : positions) {
                minX = Math.min(minX, position.getXDirAdj());
                minY = Math.min(minY, position.getYDirAdj());
                maxX = Math.max(maxX, position.getXDirAdj() + position.getWidthDirAdj());
                maxY = Math.max(maxY, position.getYDirAdj() + position.getHeightDir());
                size = Math.max(size, position.getFontSizeInPt());
                if (previous != null && wordGap(previous, position)) {
                    text.append(' ');
                }
                text.append(position.getUnicode() == null ? "" : position.getUnicode());
                previous = position;
            }
            String cleaned = text.toString().replace('\u00a0', ' ').replaceAll("\\s+", " ").trim();
            if (!cleaned.isBlank()) {
                runs.add(new FlyerCatalogParser.TextRun(
                        minX, minY, maxX - minX, maxY - minY, cleaned, fontName(positions.getFirst()), size));
            }
        }

        private static boolean breaksRun(TextPosition previous, TextPosition next) {
            if (!fontName(previous).equals(fontName(next))
                    || Math.abs(previous.getFontSizeInPt() - next.getFontSizeInPt()) > 0.4f) {
                return true;
            }
            if (Math.abs(next.getYDirAdj() - previous.getYDirAdj()) > 1.0f) {
                return true;
            }
            float size = Math.max(previous.getFontSizeInPt(), 1f);
            float gap = next.getXDirAdj() - (previous.getXDirAdj() + previous.getWidthDirAdj());
            return gap > size * 0.7f || gap < -size;
        }

        private static boolean wordGap(TextPosition previous, TextPosition next) {
            float size = Math.max(previous.getFontSizeInPt(), 1f);
            return next.getXDirAdj() - (previous.getXDirAdj() + previous.getWidthDirAdj()) >= size * 0.16f;
        }

        private static String fontName(TextPosition position) {
            if (position.getFont() == null || position.getFont().getName() == null) {
                return "";
            }
            return position.getFont().getName();
        }
    }
}

package com.egyetemkapu.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FlyerPdfExtractorTest {

    private final FlyerPdfExtractor extractor = new FlyerPdfExtractor();

    @Test
    void extractsTextFromGeneratedPdf() throws Exception {
        byte[] pdf = onePagePdf("kakaoscsiga 249 Ft");
        List<FlyerCatalogParser.ParsedPage> pages = extractor.extractPages(pdf);
        assertEquals(1, pages.size());
        assertTrue(pages.getFirst().text().toLowerCase().contains("kakaoscsiga"));
    }

    @Test
    void rendersPngForExistingPage() throws Exception {
        byte[] png = extractor.renderPagePng(onePagePdf("SPAR"), 1);
        assertTrue(png.length > 20);
        assertEquals((byte) 0x89, png[0]);
        assertEquals((byte) 'P', png[1]);
    }

    @Test
    void emptyBytesYieldNoPages() {
        assertTrue(extractor.extractPages(new byte[0]).isEmpty());
        assertEquals(0, extractor.renderPagePng(new byte[0], 1).length);
        assertFalse(extractor.renderPagePng(onePagePdfQuiet("x"), 9).length > 0);
    }

    private static byte[] onePagePdf(String text) throws Exception {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream stream = new PDPageContentStream(document, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                stream.newLineAtOffset(50, 700);
                stream.showText(text);
                stream.endText();
            }
            document.save(out);
            return out.toByteArray();
        }
    }

    private static byte[] onePagePdfQuiet(String text) {
        try {
            return onePagePdf(text);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}

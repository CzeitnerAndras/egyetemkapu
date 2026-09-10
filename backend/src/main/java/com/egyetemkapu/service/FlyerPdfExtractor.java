package com.egyetemkapu.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;

@Component
public class FlyerPdfExtractor {

    public List<FlyerCatalogParser.ParsedPage> extractPages(byte[] pdfBytes) {
        if (pdfBytes == null || pdfBytes.length == 0) {
            return List.of();
        }
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            List<FlyerCatalogParser.ParsedPage> pages = new ArrayList<>();
            for (int i = 1; i <= document.getNumberOfPages(); i++) {
                stripper.setStartPage(i);
                stripper.setEndPage(i);
                String text = stripper.getText(document);
                pages.add(new FlyerCatalogParser.ParsedPage(i, null, text == null ? "" : text.trim()));
            }
            return pages;
        } catch (Exception e) {
            return List.of();
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
}

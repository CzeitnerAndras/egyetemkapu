package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser.TextRun;
import net.sourceforge.tess4j.ITessAPI;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.Word;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;

@Component
public class CoopTesseractOcr implements CoopPageOcr {

    private static final Logger log = LoggerFactory.getLogger(CoopTesseractOcr.class);

    private final Object lock = new Object();
    private Tesseract tesseract;
    private boolean unavailable;

    @Override
    public List<TextRun> read(byte[] image) {
        if (image == null || image.length == 0) {
            return List.of();
        }
        try {
            BufferedImage buffered = ImageIO.read(new ByteArrayInputStream(image));
            if (buffered == null) {
                return List.of();
            }
            Tesseract engine = engine();
            if (engine == null) {
                return List.of();
            }
            int width = buffered.getWidth();
            int height = buffered.getHeight();
            int mid = width / 2;
            int overlap = Math.max(40, width / 12);
            List<TextRun> runs = new ArrayList<>();
            runs.addAll(recognize(engine, buffered, 0, 0, mid + overlap, height));
            runs.addAll(recognize(engine, buffered, Math.max(0, mid - overlap), 0, width - Math.max(0, mid - overlap), height));
            int lowerTop = (int) (height * 0.48);
            runs.addAll(recognize(
                    engine,
                    buffered,
                    Math.max(0, mid - overlap),
                    lowerTop,
                    width - Math.max(0, mid - overlap),
                    height - lowerTop));
            return dedupe(runs);
        } catch (Exception e) {
            log.warn("Coop page OCR failed: {}", e.getMessage());
            return List.of();
        }
    }

    private List<TextRun> recognize(Tesseract engine, BufferedImage image, int x, int y, int width, int height) {
        int clippedWidth = Math.min(width, image.getWidth() - x);
        int clippedHeight = Math.min(height, image.getHeight() - y);
        if (clippedWidth < 40 || clippedHeight < 40) {
            return List.of();
        }
        BufferedImage tile = image.getSubimage(x, y, clippedWidth, clippedHeight);
        List<Word> words;
        synchronized (lock) {
            words = engine.getWords(tile, ITessAPI.TessPageIteratorLevel.RIL_WORD);
        }
        List<TextRun> runs = new ArrayList<>();
        if (words == null) {
            return runs;
        }
        for (Word word : words) {
            if (word == null || word.getText() == null || word.getConfidence() < 40f || word.getBoundingBox() == null) {
                continue;
            }
            String text = word.getText().trim();
            if (text.isBlank()) {
                continue;
            }
            runs.add(new TextRun(
                    x + word.getBoundingBox().x,
                    y + word.getBoundingBox().y,
                    Math.max(1, word.getBoundingBox().width),
                    Math.max(1, word.getBoundingBox().height),
                    text));
        }
        return runs;
    }

    private static List<TextRun> dedupe(List<TextRun> runs) {
        List<TextRun> unique = new ArrayList<>();
        for (TextRun run : runs) {
            boolean duplicate = false;
            for (TextRun kept : unique) {
                float dx = Math.abs(run.centerX() - kept.centerX());
                float dy = Math.abs((run.y() + run.bottom()) / 2f - (kept.y() + kept.bottom()) / 2f);
                if (dx < 18f && dy < 12f && run.text().equalsIgnoreCase(kept.text())) {
                    duplicate = true;
                    break;
                }
            }
            if (!duplicate) {
                unique.add(run);
            }
        }
        return unique;
    }

    private Tesseract engine() {
        synchronized (lock) {
            if (tesseract != null || unavailable) {
                return tesseract;
            }
            try {
                Path data = trainedData();
                Tesseract created = new Tesseract();
                created.setDatapath(data.getParent().toString());
                created.setLanguage("hun");
                created.setOcrEngineMode(ITessAPI.TessOcrEngineMode.OEM_LSTM_ONLY);
                created.setPageSegMode(ITessAPI.TessPageSegMode.PSM_SPARSE_TEXT);
                created.setVariable("user_defined_dpi", "120");
                tesseract = created;
                return tesseract;
            } catch (Exception e) {
                unavailable = true;
                log.warn("Coop OCR is unavailable: {}", e.getMessage());
                return null;
            }
        }
    }

    private static Path trainedData() throws Exception {
        Path dir = Path.of(System.getProperty("java.io.tmpdir"), "egyetemkapu-tessdata");
        Path file = dir.resolve("hun.traineddata");
        if (Files.isRegularFile(file) && Files.size(file) > 1_000_000) {
            return file;
        }
        Files.createDirectories(dir);
        try (InputStream in = CoopTesseractOcr.class.getResourceAsStream("/tessdata/hun.traineddata")) {
            if (in == null) {
                throw new IllegalStateException("hun.traineddata is missing");
            }
            Files.copy(in, file, StandardCopyOption.REPLACE_EXISTING);
        }
        return file;
    }
}

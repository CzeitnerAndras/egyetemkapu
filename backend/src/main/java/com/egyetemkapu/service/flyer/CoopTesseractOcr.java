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
            List<Word> words;
            synchronized (lock) {
                words = engine.getWords(buffered, ITessAPI.TessPageIteratorLevel.RIL_WORD);
            }
            List<TextRun> runs = new ArrayList<>();
            for (Word word : words) {
                if (word == null || word.getText() == null || word.getConfidence() < 40f) {
                    continue;
                }
                String text = word.getText().trim();
                if (text.isBlank() || word.getBoundingBox() == null) {
                    continue;
                }
                runs.add(new TextRun(
                        word.getBoundingBox().x,
                        word.getBoundingBox().y,
                        Math.max(1, word.getBoundingBox().width),
                        Math.max(1, word.getBoundingBox().height),
                        text));
            }
            return runs;
        } catch (Exception e) {
            log.warn("Coop page OCR failed: {}", e.getMessage());
            return List.of();
        }
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

package com.egyetemkapu.service.flyer;

import org.junit.jupiter.api.Test;

import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CoopTesseractOcrTest {

    private final CoopTesseractOcr ocr = new CoopTesseractOcr();

    @Test
    void read_returnsNothingForAnEmptyImage() {
        assertTrue(ocr.read(null).isEmpty());
        assertTrue(ocr.read(new byte[0]).isEmpty());
    }

    @Test
    void read_returnsNothingWhenTheBytesAreNotAnImage() {
        assertTrue(ocr.read(new byte[] {1, 2, 3, 4}).isEmpty());
    }

    @Test
    void hungarianTrainedDataIsOnTheClasspath() throws Exception {
        try (InputStream in = CoopTesseractOcr.class.getResourceAsStream("/tessdata/hun.traineddata")) {
            assertNotNull(in);
            assertTrue(in.readAllBytes().length > 1_000_000);
        }
    }
}

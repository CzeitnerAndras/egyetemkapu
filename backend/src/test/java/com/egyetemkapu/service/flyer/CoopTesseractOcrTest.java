package com.egyetemkapu.service.flyer;

import org.junit.jupiter.api.Test;

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
}

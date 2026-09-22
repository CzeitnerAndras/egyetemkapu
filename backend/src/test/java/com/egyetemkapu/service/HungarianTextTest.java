package com.egyetemkapu.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HungarianTextTest {

    @Test
    void foldsHungarianAccents() {
        assertEquals("kakaoscsiga", HungarianText.normalize("Kakaóscsiga"));
        assertEquals("tuzolto", HungarianText.normalize("tűzoltó"));
    }

    @Test
    void containsIgnoresAccentsAndCase() {
        assertTrue(HungarianText.contains("Friss kakaóscsiga 249 Ft", "kakaoscsiga"));
        assertFalse(HungarianText.contains("Kenyér és tej", "kakaóscsiga"));
    }

    @Test
    void snippetHighlightsAroundMatch() {
        String snippet = HungarianText.snippet("Heti ajánlat: friss kakaóscsiga 249 Ft a pultnál", "kakaoscsiga", 12);
        assertTrue(snippet.toLowerCase().contains("kakaóscsiga") || snippet.toLowerCase().contains("kakaoscsiga"));
    }

    @Test
    void normalizeAndContainsHandleNullAndEmpty() {
        assertEquals("", HungarianText.normalize(null));
        assertFalse(HungarianText.contains("Kenyér", ""));
        assertFalse(HungarianText.contains("Kenyér", null));
        assertEquals("", HungarianText.snippet(null, "tej", 8));
        assertEquals("Rövid szöveg", HungarianText.snippet("Rövid szöveg", "nincs", 20));
    }
}

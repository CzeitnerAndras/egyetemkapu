package com.egyetemkapu.service;

import java.text.Normalizer;
import java.util.Locale;

public final class HungarianText {

    private HungarianText() {
    }

    public static String normalize(String value) {
        if (value == null) {
            return "";
        }
        String folded = value.toLowerCase(Locale.ROOT)
                .replace('ő', 'o')
                .replace('ű', 'u')
                .replace('ö', 'o')
                .replace('ü', 'u')
                .replace('á', 'a')
                .replace('é', 'e')
                .replace('í', 'i')
                .replace('ó', 'o')
                .replace('ú', 'u');
        String decomposed = Normalizer.normalize(folded, Normalizer.Form.NFD);
        return decomposed.replaceAll("\\p{M}+", "").replaceAll("\\s+", " ").trim();
    }

    public static boolean contains(String haystack, String needle) {
        String query = normalize(needle);
        if (query.isEmpty()) {
            return false;
        }
        return normalize(haystack).contains(query);
    }

    public static String snippet(String haystack, String needle, int radius) {
        if (haystack == null || haystack.isBlank()) {
            return "";
        }
        String compact = haystack.replaceAll("\\s+", " ").trim();
        String normalizedHay = normalize(compact);
        String query = normalize(needle);
        int index = query.isEmpty() ? -1 : normalizedHay.indexOf(query);
        if (index < 0) {
            return compact.length() <= radius * 2 ? compact : compact.substring(0, radius * 2) + "…";
        }
        int start = Math.max(0, mapNormalizedIndex(compact, index) - radius);
        int end = Math.min(compact.length(), mapNormalizedIndex(compact, index + query.length()) + radius);
        String slice = compact.substring(start, end).trim();
        return (start > 0 ? "…" : "") + slice + (end < compact.length() ? "…" : "");
    }

    private static int mapNormalizedIndex(String original, int normalizedIndex) {
        int seen = 0;
        for (int i = 0; i < original.length(); i++) {
            String piece = normalize(original.substring(i, i + 1));
            seen += piece.length();
            if (seen >= normalizedIndex) {
                return i;
            }
        }
        return original.length();
    }
}

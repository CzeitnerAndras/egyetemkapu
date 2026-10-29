package com.egyetemkapu.service;

import com.egyetemkapu.dto.FlyerSearchHitDto;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class FlyerSearchRank {

    // --- Limits ---
    static final int LIMIT = 80;
    private static final int PREFIX_MIN_QUERY = 3;
    private static final int PREFIX_MIN_EXTRA = 3;
    private static final int TYPO_MIN_QUERY = 5;
    private static final int TYPO_MAX_LENGTH_DIFF = 2;
    private static final double TYPO_MIN_SIMILARITY = 0.5;

    private enum Match {
        EXACT, PREFIX, TYPO
    }

    private FlyerSearchRank() {
    }

    // --- Like pattern ---
    public static String likePattern(String foldedQuery) {
        StringBuilder escaped = new StringBuilder(foldedQuery.length() + 2);
        escaped.append('%');
        for (int i = 0; i < foldedQuery.length(); i++) {
            char c = foldedQuery.charAt(i);
            if (c == '\\' || c == '%' || c == '_') {
                escaped.append('\\');
            }
            escaped.append(c);
        }
        escaped.append('%');
        return escaped.toString();
    }

    // --- Rank ---
    public static List<FlyerSearchHitDto> rank(List<FlyerSearchCandidate> candidates, String rawQuery) {
        String query = HungarianText.normalize(rawQuery);
        if (query.isEmpty() || candidates == null || candidates.isEmpty()) {
            return List.of();
        }
        Map<String, Scored> best = new LinkedHashMap<>();
        for (int i = 0; i < candidates.size(); i++) {
            FlyerSearchCandidate candidate = candidates.get(i);
            if (candidate == null || candidate.name() == null || candidate.store() == null) {
                continue;
            }
            Match match = match(candidate.name(), query);
            if (match == null) {
                continue;
            }
            String key = candidate.store() + ":" + HungarianText.normalize(candidate.name());
            Scored scored = new Scored(candidate, match, i);
            Scored previous = best.get(key);
            if (previous == null || scored.match.ordinal() < previous.match.ordinal()) {
                best.put(key, scored);
            }
        }
        return best.values().stream()
                .sorted(Comparator
                        .comparingInt((Scored scored) -> scored.match.ordinal())
                        .thenComparingInt(scored -> scored.index))
                .limit(LIMIT)
                .map(scored -> new FlyerSearchHitDto(
                        scored.candidate.flyerId(),
                        scored.candidate.store(),
                        scored.candidate.title(),
                        scored.candidate.pageNumber(),
                        scored.candidate.name(),
                        HungarianText.snippet(scored.candidate.name(), rawQuery, 80),
                        "product",
                        scored.candidate.productId()))
                .toList();
    }

    // --- Match ---
    static Match match(String name, String query) {
        if (query.isEmpty()) {
            return null;
        }
        if (HungarianText.contains(name, query)) {
            return Match.EXACT;
        }
        String folded = HungarianText.normalize(name);
        if (prefix(folded, query)) {
            return Match.PREFIX;
        }
        if (typo(folded, query)) {
            return Match.TYPO;
        }
        return null;
    }

    // --- Similarity ---
    static double similarity(String left, String right) {
        Set<String> a = trigrams(left);
        Set<String> b = trigrams(right);
        if (a.isEmpty() || b.isEmpty()) {
            return 0;
        }
        int intersection = 0;
        for (String trigram : a) {
            if (b.contains(trigram)) {
                intersection++;
            }
        }
        int union = a.size() + b.size() - intersection;
        return union == 0 ? 0 : (double) intersection / union;
    }

    // --- Prefix ---
    private static boolean prefix(String foldedName, String query) {
        if (query.length() < PREFIX_MIN_QUERY) {
            return false;
        }
        int from = 0;
        while (from <= foldedName.length() - query.length()) {
            int index = foldedName.indexOf(query, from);
            if (index < 0) {
                return false;
            }
            if (isWordBoundary(foldedName, index - 1) && extraLetters(foldedName, index + query.length()) >= PREFIX_MIN_EXTRA) {
                return true;
            }
            from = index + 1;
        }
        return false;
    }

    private static int extraLetters(String value, int start) {
        int extra = 0;
        for (int i = start; i < value.length(); i++) {
            if (!Character.isLetterOrDigit(value.charAt(i))) {
                break;
            }
            extra++;
        }
        return extra;
    }

    // --- Typo ---
    private static boolean typo(String foldedName, String query) {
        if (query.length() < TYPO_MIN_QUERY) {
            return false;
        }
        for (String word : words(foldedName)) {
            if (word.equals(query) || word.contains(query)) {
                continue;
            }
            if (Math.abs(word.length() - query.length()) > TYPO_MAX_LENGTH_DIFF) {
                continue;
            }
            if (similarity(word, query) > TYPO_MIN_SIMILARITY) {
                return true;
            }
        }
        return false;
    }

    // --- Words ---
    private static List<String> words(String folded) {
        List<String> words = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (int i = 0; i < folded.length(); i++) {
            char c = folded.charAt(i);
            if (Character.isLetterOrDigit(c)) {
                current.append(c);
            } else if (!current.isEmpty()) {
                words.add(current.toString());
                current.setLength(0);
            }
        }
        if (!current.isEmpty()) {
            words.add(current.toString());
        }
        return words;
    }

    // --- Word boundary ---
    private static boolean isWordBoundary(String value, int index) {
        if (index < 0 || index >= value.length()) {
            return true;
        }
        return !Character.isLetterOrDigit(value.charAt(index));
    }

    // --- Trigrams ---
    private static Set<String> trigrams(String value) {
        String padded = "  " + value + " ";
        Set<String> trigrams = new HashSet<>();
        for (int i = 0; i <= padded.length() - 3; i++) {
            trigrams.add(padded.substring(i, i + 3));
        }
        return trigrams;
    }

    private record Scored(FlyerSearchCandidate candidate, Match match, int index) {
    }
}

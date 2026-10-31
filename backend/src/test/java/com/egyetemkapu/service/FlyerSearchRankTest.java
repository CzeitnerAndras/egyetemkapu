package com.egyetemkapu.service;

import com.egyetemkapu.dto.FlyerSearchHitDto;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FlyerSearchRankTest {

    // --- Rank ---
    @Test
    void exactWordBeatsPrefixAndATypoAndSkipsABrandThatOnlyStartsWithTheQuery() {
        List<FlyerSearchHitDto> hits = FlyerSearchRank.rank(List.of(
                candidate(1L, "aldi", "ALMARE SEAFOOD főtt garnélarák"),
                candidate(2L, "aldi", "Jonagold alma"),
                candidate(3L, "spar", "Kakaóscsiga"),
                candidate(4L, "lidl", "Jonagold")), "alma");

        assertEquals(List.of("Jonagold alma"), names(hits));
    }

    @Test
    void foldsAccentsAndKeepsOneNamePerStore() {
        List<FlyerSearchHitDto> hits = FlyerSearchRank.rank(List.of(
                candidate(1L, 20L, "coop", "Coop Alföld", "Alma, Banán"),
                candidate(2L, 21L, "coop", "Coop Észak-Kelet", "Alma, Banán"),
                candidate(3L, 22L, "coop", "Coop Tisza", "Alma, Banán"),
                candidate(4L, 23L, "auchan", "Auchan", "GÁLA ALMA")), "alma");

        assertEquals(2, hits.size());
        assertEquals(1, hits.stream().filter(hit -> "coop".equals(hit.store())).count());
        assertEquals(1, hits.stream().filter(hit -> "auchan".equals(hit.store())).count());
        assertEquals("product", hits.getFirst().kind());
    }

    @Test
    void prefixAndTypoFollowAnExactWord() {
        List<FlyerSearchHitDto> hits = FlyerSearchRank.rank(List.of(
                candidate(1L, "spar", "Kakaóscsiga"),
                candidate(2L, "aldi", "Kaka"),
                candidate(3L, "lidl", "Jonagold")), "kaka");

        assertEquals(List.of("Kaka", "Kakaóscsiga"), names(hits));

        List<FlyerSearchHitDto> typos = FlyerSearchRank.rank(List.of(
                candidate(4L, "lidl", "Jonagold alma")), "jonagld");
        assertEquals(List.of("Jonagold alma"), names(typos));
    }

    @Test
    void keepsTheFirstEightyHits() {
        List<FlyerSearchCandidate> candidates = new ArrayList<>();
        for (int i = 0; i < 100; i++) {
            candidates.add(candidate((long) i, "aldi", "Alma " + i));
        }

        assertEquals(80, FlyerSearchRank.rank(candidates, "alma").size());
    }

    @Test
    void escapesLikeWildcards() {
        assertEquals("%100\\%\\_tej%", FlyerSearchRank.likePattern("100%_tej"));
        assertTrue(FlyerSearchRank.similarity("alma", "almare") <= 0.5);
        assertTrue(FlyerSearchRank.similarity("jonagld", "jonagold") > 0.5);
    }

    // --- Helpers ---
    private static List<String> names(List<FlyerSearchHitDto> hits) {
        return hits.stream().map(FlyerSearchHitDto::productName).toList();
    }

    private static FlyerSearchCandidate candidate(Long id, String store, String name) {
        return candidate(id, id, store, store, name);
    }

    private static FlyerSearchCandidate candidate(
            Long productId, Long flyerId, String store, String title, String name) {
        return new FlyerSearchCandidate(productId, flyerId, store, title, 1, name);
    }
}

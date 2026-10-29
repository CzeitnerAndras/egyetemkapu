package com.egyetemkapu.service;

public record FlyerSearchCandidate(
        Long productId,
        Long flyerId,
        String store,
        String title,
        int pageNumber,
        String name
) {
}

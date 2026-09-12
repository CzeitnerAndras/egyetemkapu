package com.egyetemkapu.dto;

public record FlyerSearchHitDto(
        Long flyerId,
        String store,
        String title,
        int pageNumber,
        String productName,
        String snippet,
        String kind,
        Long productId
) {
}

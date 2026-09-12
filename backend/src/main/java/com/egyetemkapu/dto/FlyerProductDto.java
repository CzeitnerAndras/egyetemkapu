package com.egyetemkapu.dto;

import com.egyetemkapu.model.FlyerProduct;

public record FlyerProductDto(
        Long id,
        int pageNumber,
        String name
) {
    public static FlyerProductDto from(FlyerProduct product) {
        return new FlyerProductDto(
                product.getId(),
                product.getPageNumber(),
                product.getName()
        );
    }
}

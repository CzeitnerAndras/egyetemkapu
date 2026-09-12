package com.egyetemkapu.dto;

import com.egyetemkapu.model.Flyer;
import com.egyetemkapu.model.FlyerProduct;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

public record FlyerDetailDto(
        Long id,
        String store,
        String title,
        String officialUrl,
        LocalDate validFrom,
        LocalDate validTo,
        List<FlyerPageDto> pages,
        List<FlyerProductDto> products
) {
    public static FlyerDetailDto from(Flyer flyer) {
        List<FlyerPageDto> pages = flyer.getPages() == null
                ? List.of()
                : flyer.getPages().stream().map(FlyerPageDto::from).toList();
        List<FlyerProductDto> products = flyer.getProducts() == null
                ? List.of()
                : flyer.getProducts().stream()
                        .sorted(Comparator
                                .comparingInt(FlyerProduct::getPageNumber)
                                .thenComparing(product -> product.getName() == null ? "" : product.getName(),
                                        String.CASE_INSENSITIVE_ORDER))
                        .map(FlyerProductDto::from)
                        .toList();
        return new FlyerDetailDto(
                flyer.getId(),
                flyer.getStore(),
                flyer.getTitle(),
                flyer.getOfficialUrl(),
                flyer.getValidFrom(),
                flyer.getValidTo(),
                pages,
                products
        );
    }
}

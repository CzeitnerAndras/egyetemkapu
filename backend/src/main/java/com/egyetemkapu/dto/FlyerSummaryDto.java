package com.egyetemkapu.dto;

import com.egyetemkapu.model.Flyer;

import java.time.LocalDate;

public record FlyerSummaryDto(
        Long id,
        String store,
        String title,
        String officialUrl,
        LocalDate validFrom,
        LocalDate validTo,
        int pageCount,
        int productCount
) {
    public static FlyerSummaryDto from(Flyer flyer) {
        return new FlyerSummaryDto(
                flyer.getId(),
                flyer.getStore(),
                flyer.getTitle(),
                flyer.getOfficialUrl(),
                flyer.getValidFrom(),
                flyer.getValidTo(),
                flyer.getPages() == null ? 0 : flyer.getPages().size(),
                flyer.getProducts() == null ? 0 : flyer.getProducts().size()
        );
    }
}

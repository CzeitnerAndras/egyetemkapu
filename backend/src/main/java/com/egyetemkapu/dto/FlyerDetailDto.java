package com.egyetemkapu.dto;

import com.egyetemkapu.model.Flyer;

import java.time.LocalDate;
import java.util.List;

public record FlyerDetailDto(
        Long id,
        String store,
        String title,
        String officialUrl,
        LocalDate validFrom,
        LocalDate validTo,
        List<FlyerPageDto> pages
) {
    public static FlyerDetailDto from(Flyer flyer) {
        List<FlyerPageDto> pages = flyer.getPages() == null
                ? List.of()
                : flyer.getPages().stream().map(FlyerPageDto::from).toList();
        return new FlyerDetailDto(
                flyer.getId(),
                flyer.getStore(),
                flyer.getTitle(),
                flyer.getOfficialUrl(),
                flyer.getValidFrom(),
                flyer.getValidTo(),
                pages
        );
    }
}

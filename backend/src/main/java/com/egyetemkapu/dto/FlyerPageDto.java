package com.egyetemkapu.dto;

import com.egyetemkapu.model.FlyerPage;

public record FlyerPageDto(
        int pageNumber,
        boolean hasImage
) {
    public static FlyerPageDto from(FlyerPage page) {
        boolean hasImage = (page.getImageUrl() != null && !page.getImageUrl().isBlank())
                || (page.getFlyer() != null && page.getFlyer().getPdfUrl() != null && !page.getFlyer().getPdfUrl().isBlank());
        return new FlyerPageDto(page.getPageNumber(), hasImage);
    }
}

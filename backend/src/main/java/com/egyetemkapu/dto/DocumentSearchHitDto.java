package com.egyetemkapu.dto;

import com.egyetemkapu.repository.DocumentSearchRow;

import java.time.LocalDateTime;

public record DocumentSearchHitDto(
        Long id,
        String title,
        String description,
        String category,
        String fileName,
        LocalDateTime createdAt,
        DocumentResponseDto.UploaderDto uploader,
        String snippet
) {
    public static DocumentSearchHitDto from(DocumentSearchRow row) {
        return new DocumentSearchHitDto(
                row.id(),
                row.title(),
                row.description(),
                row.category(),
                row.fileName(),
                row.createdAt(),
                new DocumentResponseDto.UploaderDto(row.uploaderUsername()),
                row.snippet());
    }
}

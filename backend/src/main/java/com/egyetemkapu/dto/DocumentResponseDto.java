package com.egyetemkapu.dto;

import com.egyetemkapu.model.Document;

import java.time.LocalDateTime;

public record DocumentResponseDto(
        Long id,
        String title,
        String description,
        String category,
        String fileName,
        String status,
        LocalDateTime createdAt,
        UploaderDto uploader
) {
    public record UploaderDto(String username) {
    }

    public static DocumentResponseDto from(Document document) {
        String username = document.getUploader() == null ? null : document.getUploader().getUsername();
        String status = document.getStatus() == null ? null : document.getStatus().name();
        return new DocumentResponseDto(
                document.getId(),
                document.getTitle(),
                document.getDescription(),
                document.getCategory(),
                document.getFileName(),
                status,
                document.getCreatedAt(),
                new UploaderDto(username)
        );
    }
}

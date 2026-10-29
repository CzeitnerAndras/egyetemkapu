package com.egyetemkapu.repository;

import java.time.LocalDateTime;

public record DocumentSearchRow(
        long id,
        String title,
        String description,
        String category,
        String fileName,
        LocalDateTime createdAt,
        String uploaderUsername,
        String snippet) {
}

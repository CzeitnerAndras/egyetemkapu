package com.egyetemkapu.dto;

import java.time.LocalDateTime;

public record FlashcardDto(
        Long id,
        Long deckId,
        String deckName,
        String front,
        String back,
        int intervalDays,
        LocalDateTime dueAt) {
}

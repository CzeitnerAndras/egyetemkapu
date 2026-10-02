package com.egyetemkapu.service;

import java.time.LocalDateTime;
import java.util.Locale;

public final class FlashcardScheduler {

    public static final int AGAIN_MINUTES = 10;
    public static final int MAX_INTERVAL_DAYS = 60;

    private FlashcardScheduler() {
    }

    public record NextReview(int intervalDays, LocalDateTime dueAt) {
    }

    public static NextReview schedule(int intervalDays, String rating, LocalDateTime now) {
        if (now == null) {
            throw new IllegalArgumentException("Hiányzik az idő.");
        }
        String normalized = rating == null ? "" : rating.trim().toLowerCase(Locale.ROOT);
        if ("again".equals(normalized)) {
            return new NextReview(0, now.plusMinutes(AGAIN_MINUTES));
        }
        if ("good".equals(normalized)) {
            int current = Math.max(intervalDays, 0);
            int next = current < 1 ? 1 : Math.min(current * 2, MAX_INTERVAL_DAYS);
            return new NextReview(next, now.plusDays(next));
        }
        throw new IllegalArgumentException("Az értékelés csak again vagy good lehet.");
    }
}

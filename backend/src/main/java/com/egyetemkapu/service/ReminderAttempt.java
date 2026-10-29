package com.egyetemkapu.service;

import java.time.Duration;
import java.time.LocalDateTime;

final class ReminderAttempt {

    static final int MAX_ATTEMPTS = 5;
    static final Duration STALE_AFTER = Duration.ofMinutes(2);
    static final int ERROR_LIMIT = 500;

    private ReminderAttempt() {
    }

    // --- Backoff ---
    static Duration backoff(int attempts) {
        int exponent = Math.min(Math.max(attempts, 1) - 1, 4);
        return Duration.ofMinutes(1L << exponent);
    }

    static LocalDateTime nextAttemptAt(LocalDateTime now, int attempts) {
        return now.plus(backoff(attempts));
    }

    static boolean giveUp(int attempts, boolean permanent) {
        return permanent || attempts >= MAX_ATTEMPTS;
    }

    static String limit(String error) {
        if (error == null || error.isBlank()) {
            return "unknown";
        }
        String trimmed = error.trim();
        if (trimmed.length() <= ERROR_LIMIT) {
            return trimmed;
        }
        return trimmed.substring(0, ERROR_LIMIT);
    }
}

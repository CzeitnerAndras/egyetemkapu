package com.egyetemkapu.dto;

import com.egyetemkapu.model.ReminderOutbox;

import java.time.LocalDateTime;

public record DeadReminderDto(
        long id,
        String channel,
        String kind,
        int attempts,
        String lastError,
        LocalDateTime deadline,
        String message
) {
    public static DeadReminderDto from(ReminderOutbox row) {
        return new DeadReminderDto(
                row.getId(),
                row.getChannel().name(),
                row.getKind().name(),
                row.getAttempts(),
                row.getLastError(),
                row.getDeadline(),
                shorten(row.getMessage()));
    }

    private static String shorten(String message) {
        if (message == null) {
            return "";
        }
        String compact = message.replaceAll("\\s+", " ").trim();
        return compact.length() <= 180 ? compact : compact.substring(0, 180);
    }
}

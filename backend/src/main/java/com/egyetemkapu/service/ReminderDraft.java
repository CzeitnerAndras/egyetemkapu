package com.egyetemkapu.service;

import com.egyetemkapu.model.ReminderChannel;
import com.egyetemkapu.model.ReminderKind;

import java.time.LocalDateTime;

public record ReminderDraft(
        String idempotencyKey,
        long taskId,
        long userId,
        ReminderChannel channel,
        ReminderKind kind,
        int hoursBefore,
        LocalDateTime deadline,
        String message) {
}

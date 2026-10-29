package com.egyetemkapu.service;

import com.egyetemkapu.model.ReminderChannel;
import com.egyetemkapu.model.ReminderKind;
import com.egyetemkapu.model.ReminderOutbox;

import java.time.LocalDateTime;

public record ClaimedReminder(
        long id,
        long taskId,
        long userId,
        ReminderChannel channel,
        ReminderKind kind,
        int hoursBefore,
        LocalDateTime deadline,
        String message) {

    static ClaimedReminder from(ReminderOutbox row) {
        return new ClaimedReminder(
                row.getId(),
                row.getTaskId(),
                row.getUserId(),
                row.getChannel(),
                row.getKind(),
                row.getHoursBefore(),
                row.getDeadline(),
                row.getMessage());
    }
}

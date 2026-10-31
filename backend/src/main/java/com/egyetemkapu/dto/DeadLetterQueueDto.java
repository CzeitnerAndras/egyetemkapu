package com.egyetemkapu.dto;

import java.util.List;

public record DeadLetterQueueDto(
        List<DeadReminderDto> reminders,
        List<DeadFlyerSyncDto> flyerSyncs
) {
}

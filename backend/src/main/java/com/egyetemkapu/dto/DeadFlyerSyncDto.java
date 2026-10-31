package com.egyetemkapu.dto;

import java.time.LocalDateTime;

public record DeadFlyerSyncDto(
        String store,
        String lastError,
        LocalDateTime finishedAt
) {
}

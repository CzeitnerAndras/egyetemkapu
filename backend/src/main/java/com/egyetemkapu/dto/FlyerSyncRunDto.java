package com.egyetemkapu.dto;

import com.egyetemkapu.model.FlyerSyncRun;

import java.time.LocalDateTime;

public record FlyerSyncRunDto(
        String store,
        String status,
        LocalDateTime startedAt,
        LocalDateTime finishedAt,
        int productCount,
        String errorMessage
) {
    // --- Never synced ---
    public static FlyerSyncRunDto never(String store) {
        return new FlyerSyncRunDto(store, "never", null, null, 0, null);
    }

    // --- From a run ---
    public static FlyerSyncRunDto from(FlyerSyncRun run) {
        return new FlyerSyncRunDto(
                run.getStore(),
                run.getStatus(),
                run.getStartedAt(),
                run.getFinishedAt(),
                run.getProductCount(),
                run.getErrorMessage());
    }
}

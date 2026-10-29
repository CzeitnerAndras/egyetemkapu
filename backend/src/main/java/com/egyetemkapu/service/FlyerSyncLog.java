package com.egyetemkapu.service;

import com.egyetemkapu.dto.FlyerSyncRunDto;
import com.egyetemkapu.model.FlyerSyncRun;
import com.egyetemkapu.repository.FlyerSyncRunRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class FlyerSyncLog {

    private static final int ERROR_LIMIT = 1000;
    private static final int KEEP_DAYS = 30;

    private final FlyerSyncRunRepository repository;

    public FlyerSyncLog(FlyerSyncRunRepository repository) {
        this.repository = repository;
    }

    // --- Record ---
    @Transactional
    public void record(String store, LocalDateTime started, LocalDateTime finished, int productCount, String error) {
        repository.deleteByStartedAtBefore(finished.minusDays(KEEP_DAYS));
        FlyerSyncRun run = new FlyerSyncRun();
        run.setStore(store);
        run.setStartedAt(started);
        run.setFinishedAt(finished);
        run.setStatus(error == null ? "ok" : "failed");
        run.setProductCount(error == null ? productCount : 0);
        run.setErrorMessage(limit(error));
        repository.save(run);
    }

    // --- Latest ---
    @Transactional(readOnly = true)
    public List<FlyerSyncRunDto> latest() {
        Map<String, FlyerSyncRun> byStore = new HashMap<>();
        for (FlyerSyncRun run : repository.findAllByOrderByStartedAtDesc()) {
            byStore.putIfAbsent(run.getStore(), run);
        }
        List<FlyerSyncRunDto> rows = new ArrayList<>();
        for (String store : FlyerSyncService.stores()) {
            FlyerSyncRun run = byStore.get(store);
            rows.add(run == null ? FlyerSyncRunDto.never(store) : FlyerSyncRunDto.from(run));
        }
        return rows;
    }

    // --- Error text ---
    private static String limit(String error) {
        if (error == null) {
            return null;
        }
        String trimmed = error.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.length() <= ERROR_LIMIT ? trimmed : trimmed.substring(0, ERROR_LIMIT);
    }
}

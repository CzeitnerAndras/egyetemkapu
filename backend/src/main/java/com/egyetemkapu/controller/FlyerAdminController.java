package com.egyetemkapu.controller;

import com.egyetemkapu.dto.FlyerSyncRunDto;
import com.egyetemkapu.service.FlyerSyncLog;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/flyers/admin")
public class FlyerAdminController {

    private final FlyerSyncLog flyerSyncLog;

    public FlyerAdminController(FlyerSyncLog flyerSyncLog) {
        this.flyerSyncLog = flyerSyncLog;
    }

    // --- Sync runs ---
    @GetMapping("/sync-runs")
    public List<FlyerSyncRunDto> syncRuns() {
        return flyerSyncLog.latest();
    }
}

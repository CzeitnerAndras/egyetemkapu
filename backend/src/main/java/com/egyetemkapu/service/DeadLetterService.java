package com.egyetemkapu.service;

import com.egyetemkapu.dto.DeadFlyerSyncDto;
import com.egyetemkapu.dto.DeadLetterQueueDto;
import com.egyetemkapu.dto.DeadReminderDto;
import com.egyetemkapu.dto.FlyerSyncRunDto;
import com.egyetemkapu.model.ReminderStatus;
import com.egyetemkapu.repository.ReminderOutboxRepository;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class DeadLetterService {

    private final ReminderOutboxRepository reminderOutboxRepository;
    private final ReminderOutboxService reminderOutboxService;
    private final ReminderDispatchService reminderDispatchService;
    private final FlyerSyncLog flyerSyncLog;
    private final FlyerSyncService flyerSyncService;
    private final Clock clock;

    public DeadLetterService(
            ReminderOutboxRepository reminderOutboxRepository,
            ReminderOutboxService reminderOutboxService,
            ReminderDispatchService reminderDispatchService,
            FlyerSyncLog flyerSyncLog,
            FlyerSyncService flyerSyncService,
            Clock clock) {
        this.reminderOutboxRepository = reminderOutboxRepository;
        this.reminderOutboxService = reminderOutboxService;
        this.reminderDispatchService = reminderDispatchService;
        this.flyerSyncLog = flyerSyncLog;
        this.flyerSyncService = flyerSyncService;
        this.clock = clock;
    }

    // --- Queue ---
    public DeadLetterQueueDto list() {
        List<DeadReminderDto> reminders = reminderOutboxRepository
                .findTop50ByStatusOrderByIdDesc(ReminderStatus.DEAD)
                .stream()
                .map(DeadReminderDto::from)
                .toList();
        List<DeadFlyerSyncDto> flyers = new ArrayList<>();
        for (FlyerSyncRunDto run : flyerSyncLog.latest()) {
            if ("failed".equals(run.status())) {
                flyers.add(new DeadFlyerSyncDto(run.store(), run.errorMessage(), run.finishedAt()));
            }
        }
        return new DeadLetterQueueDto(reminders, flyers);
    }

    public ReminderRetry retryReminder(long id) {
        LocalDateTime now = LocalDateTime.now(clock);
        ReminderRetry result = reminderOutboxService.retryDead(id, now);
        if (result == ReminderRetry.REQUEUED) {
            reminderDispatchService.dispatch(now);
        }
        return result;
    }

    public boolean retryFlyer(String store) {
        if (!flyerSyncService.reserveStoreRetry(store)) {
            return false;
        }
        flyerSyncService.runReservedStoreRetry(store);
        return true;
    }
}

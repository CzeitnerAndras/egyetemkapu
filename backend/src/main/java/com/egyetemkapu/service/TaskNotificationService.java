package com.egyetemkapu.service;

import com.egyetemkapu.model.Settings;
import com.egyetemkapu.model.Task;
import com.egyetemkapu.repository.SettingsRepository;
import com.egyetemkapu.repository.TaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class TaskNotificationService {

    static final int MIN_PING_HOURS_BEFORE = 1;
    static final int MAX_PING_HOURS_BEFORE = 168;

    private static final Logger log = LoggerFactory.getLogger(TaskNotificationService.class);

    private final TaskRepository taskRepository;
    private final SettingsRepository settingsRepository;
    private final ReminderOutboxService reminderOutboxService;
    private final ReminderDispatchService reminderDispatchService;
    private final Clock clock;
    private final AtomicBoolean running = new AtomicBoolean(false);

    public TaskNotificationService(
            TaskRepository taskRepository,
            SettingsRepository settingsRepository,
            ReminderOutboxService reminderOutboxService,
            ReminderDispatchService reminderDispatchService,
            Clock clock) {
        this.taskRepository = taskRepository;
        this.settingsRepository = settingsRepository;
        this.reminderOutboxService = reminderOutboxService;
        this.reminderDispatchService = reminderDispatchService;
        this.clock = clock;
    }

    // --- Deadline pings ---
    @Scheduled(cron = "0 * * * * *")
    public void checkDeadlinesAndPing() {
        if (!running.compareAndSet(false, true)) {
            return;
        }
        try {
            LocalDateTime now = LocalDateTime.now(clock);
            enqueueDue(now);
            reminderDispatchService.dispatch(now);
        } finally {
            running.set(false);
        }
    }

    public static int clampPingHoursBefore(Integer hours) {
        if (hours == null || hours < MIN_PING_HOURS_BEFORE) {
            return 24;
        }
        return Math.min(MAX_PING_HOURS_BEFORE, hours);
    }

    private void enqueueDue(LocalDateTime now) {
        for (Task task : taskRepository.findAllByCompletedFalse()) {
            if (!DeadlineReminderPlanner.windowOpen(task, now)) {
                continue;
            }
            Settings settings = null;
            if (task.getUser() != null) {
                settings = settingsRepository.findByUser(task.getUser()).orElse(null);
            }
            for (ReminderDraft draft : DeadlineReminderPlanner.plan(task, settings, now)) {
                try {
                    reminderOutboxService.enqueue(draft, now);
                } catch (RuntimeException ex) {
                    log.warn("Could not enqueue reminder {} ({})",
                            draft.idempotencyKey(), ex.getClass().getSimpleName());
                }
            }
        }
    }
}

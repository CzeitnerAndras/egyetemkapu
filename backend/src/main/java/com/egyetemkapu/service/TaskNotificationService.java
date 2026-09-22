package com.egyetemkapu.service;

import com.egyetemkapu.model.Settings;
import com.egyetemkapu.repository.SettingsRepository;
import com.egyetemkapu.repository.TaskRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Service
public class TaskNotificationService {

    static final int MIN_PING_HOURS_BEFORE = 1;
    static final int MAX_PING_HOURS_BEFORE = 168;

    private final TaskRepository taskRepository;
    private final SettingsRepository settingsRepository;
    private final NotificationSenderService notificationSenderService;
    private final Clock clock;

    public TaskNotificationService(
            TaskRepository taskRepository,
            SettingsRepository settingsRepository,
            NotificationSenderService notificationSenderService,
            Clock clock) {
        this.taskRepository = taskRepository;
        this.settingsRepository = settingsRepository;
        this.notificationSenderService = notificationSenderService;
        this.clock = clock;
    }

    @Scheduled(cron = "0 * * * * *")
    public void checkDeadlinesAndPing() {
        LocalDateTime nowMinute = LocalDateTime.now(clock).truncatedTo(ChronoUnit.MINUTES);

        var activeTasks = taskRepository.findAllByCompletedFalse();

        for (var task : activeTasks) {
            if (task.getDeadline() == null || task.getUser() == null) continue;

            LocalDateTime deadlineMinute = task.getDeadline().truncatedTo(ChronoUnit.MINUTES);
            int hoursBeforeDeadline = task.getPingHoursBefore() == null ? 0 : task.getPingHoursBefore();
            boolean atDeadline = nowMinute.equals(deadlineMinute);
            boolean hoursBefore = isValidHoursBefore(hoursBeforeDeadline)
                    && nowMinute.equals(deadlineMinute.minusHours(hoursBeforeDeadline));

            if (!atDeadline && !hoursBefore) continue;

            Settings settings = settingsRepository.findByUser(task.getUser()).orElse(null);
            if (settings == null) continue;

            String language = task.getUser().getPreferredLanguage();

            if (hoursBefore) {
                String msg = DeadlinePingMessages.hoursBefore(
                        language, task.getTitle(), task.getTaskType(), hoursBeforeDeadline);

                if (task.isPingDayBefore() && isValid(settings.getDiscordWebhook()))
                    notificationSenderService.sendDiscordMessage(settings.getDiscordWebhook(), msg);

                if (task.isPingTelegramDayBefore() && isValid(settings.getTelegramChatId()))
                    notificationSenderService.sendTelegramMessage(settings.getTelegramChatId(), msg);
            }

            if (atDeadline) {
                String msg = DeadlinePingMessages.atDeadline(language, task.getTitle(), task.getTaskType());

                if (task.isPingOnDay() && isValid(settings.getDiscordWebhook()))
                    notificationSenderService.sendDiscordMessage(settings.getDiscordWebhook(), msg);

                if (task.isPingTelegramOnDay() && isValid(settings.getTelegramChatId()))
                    notificationSenderService.sendTelegramMessage(settings.getTelegramChatId(), msg);
            }
        }
    }

    public static int clampPingHoursBefore(Integer hours) {
        if (hours == null || hours < MIN_PING_HOURS_BEFORE) return 24;
        return Math.min(MAX_PING_HOURS_BEFORE, hours);
    }

    private static boolean isValidHoursBefore(int hours) {
        return hours >= MIN_PING_HOURS_BEFORE && hours <= MAX_PING_HOURS_BEFORE;
    }

    private boolean isValid(String value) {
        return value != null && !value.trim().isEmpty();
    }
}

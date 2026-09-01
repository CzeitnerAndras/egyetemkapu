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
            boolean dayBefore = nowMinute.equals(deadlineMinute.minusHours(24));
            boolean twoHoursBefore = nowMinute.equals(deadlineMinute.minusHours(2));

            if (!dayBefore && !twoHoursBefore) continue;

            Settings settings = settingsRepository.findByUser(task.getUser()).orElse(null);
            if (settings == null) continue;

            String language = task.getUser().getPreferredLanguage();

            if (dayBefore) {
                String msg = DeadlinePingMessages.dayBefore(language, task.getTitle(), task.getTaskType());

                if (task.isPingDayBefore() && isValid(settings.getDiscordWebhook()))
                    notificationSenderService.sendDiscordMessage(settings.getDiscordWebhook(), msg);

                if (task.isPingTelegramDayBefore() && isValid(settings.getTelegramChatId()))
                    notificationSenderService.sendTelegramMessage(settings.getTelegramChatId(), msg);
            }

            if (twoHoursBefore) {
                String msg = DeadlinePingMessages.twoHoursBefore(language, task.getTitle(), task.getTaskType());

                if (task.isPingOnDay() && isValid(settings.getDiscordWebhook()))
                    notificationSenderService.sendDiscordMessage(settings.getDiscordWebhook(), msg);

                if (task.isPingTelegramOnDay() && isValid(settings.getTelegramChatId()))
                    notificationSenderService.sendTelegramMessage(settings.getTelegramChatId(), msg);
            }
        }
    }

    private boolean isValid(String value) {
        return value != null && !value.trim().isEmpty();
    }
}

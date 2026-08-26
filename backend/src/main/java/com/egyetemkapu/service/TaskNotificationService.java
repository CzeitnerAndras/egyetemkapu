package com.egyetemkapu.service;

import com.egyetemkapu.model.Settings;
import com.egyetemkapu.repository.SettingsRepository;
import com.egyetemkapu.repository.TaskRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.time.Duration;

@Service
public class TaskNotificationService {

    private final TaskRepository taskRepository;
    private final SettingsRepository settingsRepository;
    private final NotificationSenderService notificationSenderService;

    public TaskNotificationService(TaskRepository taskRepository, SettingsRepository settingsRepository, NotificationSenderService notificationSenderService) {
        this.taskRepository = taskRepository;
        this.settingsRepository = settingsRepository;
        this.notificationSenderService = notificationSenderService;
    }

    @Scheduled(cron = "0 * * * * *")
    public void checkDeadlinesAndPing() {
        System.out.println("Időzítő lefutott: Ellenőrzöm a közeledő határidőket...");

        var activeTasks = taskRepository.findAllByCompletedFalse();
        var now = LocalDateTime.now();

        for (var task : activeTasks) {
            if (task.getDeadline() == null || task.getUser() == null) continue;

            long minutesUntilDeadline = Duration.between(now, task.getDeadline()).toMinutes();
            
            if (minutesUntilDeadline == 1440 || minutesUntilDeadline == 120) {
                Settings settings = settingsRepository.findByUser(task.getUser()).orElse(null);
                if (settings == null) continue;

                if (minutesUntilDeadline == 1440) {
                    String msg = "Pajtás holnap van a **" + task.getTitle() + "** (" + task.getTaskType() + ") határideje! Ideje volna készülni rá!";
                    
                    if (task.isPingDayBefore() && isValid(settings.getDiscordWebhook())) 
                        notificationSenderService.sendDiscordMessage(settings.getDiscordWebhook(), msg);
                        
                    if (task.isPingTelegramDayBefore() && isValid(settings.getTelegramChatId())) 
                        notificationSenderService.sendTelegramMessage(settings.getTelegramChatId(), msg);
                }

                if (minutesUntilDeadline == 120) {
                    String msg = "Cimbora ma van a **" + task.getTitle() + "** (" + task.getTaskType() + ") határideje!";
                    
                    if (task.isPingOnDay() && isValid(settings.getDiscordWebhook())) 
                        notificationSenderService.sendDiscordMessage(settings.getDiscordWebhook(), msg);
                        
                    if (task.isPingTelegramOnDay() && isValid(settings.getTelegramChatId())) 
                        notificationSenderService.sendTelegramMessage(settings.getTelegramChatId(), msg);
                }
            }
        }
    }

    private boolean isValid(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
package com.egyetemkapu.service;

import com.egyetemkapu.model.Settings;
import com.egyetemkapu.repository.SettingsRepository;
import com.egyetemkapu.repository.TaskRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.time.LocalDateTime;
import java.time.Duration;

@Service
public class TaskNotificationService {

    private final TaskRepository taskRepository;
    private final SettingsRepository settingsRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${TELEGRAM_BOT_TOKEN:nincs_megadva}")
    private String telegramBotToken;

    public TaskNotificationService(TaskRepository taskRepository, SettingsRepository settingsRepository) {
        this.taskRepository = taskRepository;
        this.settingsRepository = settingsRepository;
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
                        sendDiscordMessage(settings.getDiscordWebhook(), msg);
                        
                    if (task.isPingTelegramDayBefore() && isValid(settings.getTelegramChatId())) 
                        sendTelegramMessage(settings.getTelegramChatId(), msg);
                }

                if (minutesUntilDeadline == 120) {
                    String msg = "Cimbora ma van a **" + task.getTitle() + "** (" + task.getTaskType() + ") határideje!";
                    
                    if (task.isPingOnDay() && isValid(settings.getDiscordWebhook())) 
                        sendDiscordMessage(settings.getDiscordWebhook(), msg);
                        
                    if (task.isPingTelegramOnDay() && isValid(settings.getTelegramChatId())) 
                        sendTelegramMessage(settings.getTelegramChatId(), msg);
                }
            }
        }
    }

    private boolean isValid(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private void sendDiscordMessage(String webhookUrl, String message) {
        Map<String, String> payload = Map.of("content", message);
        try {
            restTemplate.postForEntity(webhookUrl, payload, String.class);
            System.out.println("Sikeresen megpingeltem a Discordot!");
        } catch (Exception e) {
            System.out.println("Hiba a Discord üzenet küldésekor: " + e.getMessage());
        }
    }

    private void sendTelegramMessage(String chatId, String message) {
        if ("nincs_megadva".equals(telegramBotToken)) {
            System.out.println("A Telegram Bot Token hiányzik az application.properties-ből!");
            return;
        }
        
        String telegramUrl = "https://api.telegram.org/bot" + telegramBotToken + "/sendMessage";
        Map<String, String> payload = Map.of(
                "chat_id", chatId,
                "text", message
        );
        
        try {
            restTemplate.postForEntity(telegramUrl, payload, String.class);
            System.out.println("Sikeresen megpingeltem a Telegramot!");
        } catch (Exception e) {
            System.out.println("Hiba a Telegram üzenet küldésekor: " + e.getMessage());
        }
    }
}
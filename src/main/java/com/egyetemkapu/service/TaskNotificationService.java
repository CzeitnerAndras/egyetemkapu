package com.egyetemkapu.service;

import com.egyetemkapu.repository.TaskRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.Map;

@Service
public class TaskNotificationService {

    private final TaskRepository taskRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${DISCORD_WEBHOOK_URL:IDE_MASOLD_BE}")
    private String discordWebhookUrl;

    public TaskNotificationService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }


    @Scheduled(cron = "0 * * * * *") // test alatt percenként
    public void checkDeadlinesAndPing() {
        System.out.println("Időzítő lefutott: Ellenőrzöm a közeledő határidőket...");

        var activeTasks = taskRepository.findAllByCompletedFalse();
        var now = java.time.LocalDateTime.now();

        for (var task : activeTasks) {
            if (task.isPingDayBefore() && task.getDeadline().isAfter(now) && task.getDeadline().isBefore(now.plusHours(24))) {
                String message = "Cimbora, holnap lejár a(z) **" + task.getTitle() + "** (" + task.getTaskType() + ") határideje! " +
                        "Ideje volna elkezdeni tanulni.....";
                sendDiscordMessage(message);
            }
        }
    }

    private void sendDiscordMessage(String message) {
        if (discordWebhookUrl == null || discordWebhookUrl.isEmpty() || discordWebhookUrl.contains("IDE_MASOLD_BE")) {
            System.out.println("Discord URL nincs beállítva! " + message);
            return;
        }

        Map<String, String> payload = Map.of("content", message);
        try {
            restTemplate.postForEntity(discordWebhookUrl, payload, String.class);
            System.out.println("Sikeresen megpingeltem a Discordot!");
        } catch (Exception e) {
            System.out.println("Hiba a Discord üzenet küldésekor: " + e.getMessage());
        }
    }
}
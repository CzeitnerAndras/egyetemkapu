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


    @Scheduled(cron = "0 * * * * *")
    public void checkDeadlinesAndPing() {
        System.out.println("Ellenőrzöm a közeledő határidőket...");

        // Test
        sendDiscordMessage("Teszt Elek");
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
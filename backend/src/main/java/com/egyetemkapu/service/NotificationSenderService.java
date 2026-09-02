package com.egyetemkapu.service;

import com.egyetemkapu.security.DiscordWebhookValidator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class NotificationSenderService {

    private final RestTemplate restTemplate;
    public NotificationSenderService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Value("${TELEGRAM_BOT_TOKEN:nincs_megadva}")
    private String telegramBotToken;

    @Async
    public void sendDiscordMessage(String webhookUrl, String message) {
        if (!DiscordWebhookValidator.isAllowed(webhookUrl)) {
            System.out.println("Elutasított Discord webhook URL, üzenet nem lett elküldve.");
            return;
        }
        Map<String, String> payload = Map.of("content", message);
        try {
            restTemplate.postForEntity(webhookUrl, payload, String.class);
            System.out.println("Sikeresen megpingeltem a Discordot! (Aszinkron háttérszálon)");
        } catch (Exception e) {
            System.out.println("Hiba a Discord üzenet küldésekor: " + e.getMessage());
        }
    }

    @Async
    public void sendTelegramMessage(String chatId, String message) {
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
            System.out.println("Sikeresen megpingeltem a Telegramot! (Aszinkron háttérszálon)");
        } catch (Exception e) {
            System.out.println("Hiba a Telegram üzenet küldésekor: " + e.getMessage());
        }
    }
}
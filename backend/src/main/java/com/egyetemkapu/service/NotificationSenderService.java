package com.egyetemkapu.service;

import com.egyetemkapu.security.DiscordWebhookValidator;
import com.egyetemkapu.security.TelegramChatIdValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class NotificationSenderService {

    private static final Logger log = LoggerFactory.getLogger(NotificationSenderService.class);
    private static final String MISSING_TOKEN = "nincs_megadva";

    private final RestTemplate restTemplate;

    public NotificationSenderService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Value("${TELEGRAM_BOT_TOKEN:nincs_megadva}")
    private String telegramBotToken;

    @Async
    // --- Discord ---
    public void sendDiscordMessage(String webhookUrl, String message) {
        DeliveryResult result = deliverDiscord(webhookUrl, message);
        if (result.outcome() != DeliveryOutcome.SENT) {
            log.warn("Discord message not sent ({})", result.error());
        }
    }

    @Async
    // --- Telegram ---
    public void sendTelegramMessage(String chatId, String message) {
        DeliveryResult result = deliverTelegram(chatId, message);
        if (result.outcome() != DeliveryOutcome.SENT) {
            log.warn("Telegram message not sent ({})", result.error());
        }
    }

    // --- Delivery ---
    public DeliveryResult deliverDiscord(String webhookUrl, String message) {
        if (!DiscordWebhookValidator.isAllowed(webhookUrl)) {
            return DeliveryResult.permanent("rejected webhook");
        }
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    webhookUrl.trim(), Map.of("content", message), String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                return DeliveryResult.sent();
            }
            return classify("discord", response.getStatusCode());
        } catch (HttpStatusCodeException ex) {
            return classify("discord", ex.getStatusCode());
        } catch (RestClientException ex) {
            return DeliveryResult.retry("discord unreachable");
        } catch (RuntimeException ex) {
            return DeliveryResult.retry(ex.getClass().getSimpleName());
        }
    }

    public DeliveryResult deliverTelegram(String chatId, String message) {
        if (!TelegramChatIdValidator.isAllowed(chatId)) {
            return DeliveryResult.permanent("rejected telegram chat");
        }
        if (telegramBotToken == null || telegramBotToken.isBlank() || MISSING_TOKEN.equals(telegramBotToken)) {
            return DeliveryResult.retry("telegram token missing");
        }
        String telegramUrl = "https://api.telegram.org/bot" + telegramBotToken + "/sendMessage";
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    telegramUrl,
                    Map.of("chat_id", chatId.trim(), "text", message),
                    String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                return DeliveryResult.sent();
            }
            return classify("telegram", response.getStatusCode());
        } catch (HttpStatusCodeException ex) {
            return classify("telegram", ex.getStatusCode());
        } catch (RestClientException ex) {
            return DeliveryResult.retry("telegram unreachable");
        } catch (RuntimeException ex) {
            return DeliveryResult.retry(ex.getClass().getSimpleName());
        }
    }

    private static DeliveryResult classify(String channel, HttpStatusCode status) {
        int code = status.value();
        String error = channel + " " + code;
        if (code == 429 || code == 408 || code >= 500) {
            return DeliveryResult.retry(error);
        }
        if (code >= 400) {
            return DeliveryResult.permanent(error);
        }
        return DeliveryResult.retry(error);
    }
}

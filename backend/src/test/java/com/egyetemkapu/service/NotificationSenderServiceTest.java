package com.egyetemkapu.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationSenderServiceTest {

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private NotificationSenderService notificationSenderService;

    private static final String VALID_WEBHOOK =
            "https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyzABCDEF123456";

    @Test
    void sendDiscordMessage_SuccessfulCall_DoesNotThrowException() {
        String message = "Közeledik a vizsga!";
        when(restTemplate.postForEntity(eq(VALID_WEBHOOK), any(Map.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>("OK", HttpStatus.OK));
        notificationSenderService.sendDiscordMessage(VALID_WEBHOOK, message);
        verify(restTemplate, times(1)).postForEntity(eq(VALID_WEBHOOK), any(Map.class), eq(String.class));
    }

    @Test
    void sendDiscordMessage_ApiThrowsError_CatchesExceptionSilently() {
        String message = "Teszt üzenet";
        when(restTemplate.postForEntity(eq(VALID_WEBHOOK), any(Map.class), eq(String.class)))
                .thenThrow(new RuntimeException("Connection Timeout"));
        notificationSenderService.sendDiscordMessage(VALID_WEBHOOK, message);

        verify(restTemplate, times(1)).postForEntity(eq(VALID_WEBHOOK), any(Map.class), eq(String.class));
    }

    @Test
    void sendDiscordMessage_RejectsNonDiscordUrl() {
        notificationSenderService.sendDiscordMessage("http://127.0.0.1/latest/meta-data/", "ssrf");
        verify(restTemplate, never()).postForEntity(any(String.class), any(), eq(String.class));
    }

    @Test
    void deliverDiscord_NotFoundIsPermanent() {
        when(restTemplate.postForEntity(eq(VALID_WEBHOOK), any(Map.class), eq(String.class)))
                .thenThrow(HttpClientErrorException.create(
                        HttpStatus.NOT_FOUND, "missing", HttpHeaders.EMPTY, new byte[0], StandardCharsets.UTF_8));

        DeliveryResult result = notificationSenderService.deliverDiscord(VALID_WEBHOOK, "ping");

        assertEquals(DeliveryOutcome.PERMANENT, result.outcome());
        assertEquals("discord 404", result.error());
    }

    @Test
    void deliverDiscord_RateLimitIsRetry() {
        when(restTemplate.postForEntity(eq(VALID_WEBHOOK), any(Map.class), eq(String.class)))
                .thenThrow(HttpClientErrorException.create(
                        HttpStatus.TOO_MANY_REQUESTS, "slow", HttpHeaders.EMPTY, new byte[0], StandardCharsets.UTF_8));

        DeliveryResult result = notificationSenderService.deliverDiscord(VALID_WEBHOOK, "ping");

        assertEquals(DeliveryOutcome.RETRY, result.outcome());
        assertEquals("discord 429", result.error());
    }

    @Test
    void deliverDiscord_ServerErrorAndTimeoutAreRetry() {
        when(restTemplate.postForEntity(eq(VALID_WEBHOOK), any(Map.class), eq(String.class)))
                .thenThrow(HttpServerErrorException.create(
                        HttpStatus.BAD_GATEWAY, "down", HttpHeaders.EMPTY, new byte[0], StandardCharsets.UTF_8));
        assertEquals(DeliveryOutcome.RETRY,
                notificationSenderService.deliverDiscord(VALID_WEBHOOK, "ping").outcome());

        when(restTemplate.postForEntity(eq(VALID_WEBHOOK), any(Map.class), eq(String.class)))
                .thenThrow(new ResourceAccessException("https://discord.com/api/webhooks/secret timed out"));
        DeliveryResult timeout = notificationSenderService.deliverDiscord(VALID_WEBHOOK, "ping");
        assertEquals(DeliveryOutcome.RETRY, timeout.outcome());
        assertEquals("discord unreachable", timeout.error());
    }

    @Test
    void deliverTelegram_MissingTokenDoesNotCallTelegram() {
        DeliveryResult result = notificationSenderService.deliverTelegram("12345", "ping");

        assertEquals(DeliveryOutcome.RETRY, result.outcome());
        assertEquals("telegram token missing", result.error());
        verify(restTemplate, never()).postForEntity(any(String.class), any(), eq(String.class));
    }

    @Test
    void deliverTelegram_UnknownChatIsPermanent() {
        ReflectionTestUtils.setField(notificationSenderService, "telegramBotToken", "bot-token");
        when(restTemplate.postForEntity(contains("/sendMessage"), any(Map.class), eq(String.class)))
                .thenThrow(HttpClientErrorException.create(
                        HttpStatus.BAD_REQUEST, "chat not found", HttpHeaders.EMPTY, new byte[0], StandardCharsets.UTF_8));

        DeliveryResult result = notificationSenderService.deliverTelegram("12345", "ping");

        assertEquals(DeliveryOutcome.PERMANENT, result.outcome());
        assertEquals("telegram 400", result.error());
    }
}
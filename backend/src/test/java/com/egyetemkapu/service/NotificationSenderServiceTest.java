package com.egyetemkapu.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

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
}
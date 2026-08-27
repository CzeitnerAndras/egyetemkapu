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

    @Test
    void sendDiscordMessage_SuccessfulCall_DoesNotThrowException() {
        String webhookUrl = "https://discord.com/api/webhooks/teszt_url";
        String message = "Közeledik a vizsga!";
        when(restTemplate.postForEntity(eq(webhookUrl), any(Map.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>("OK", HttpStatus.OK));
        notificationSenderService.sendDiscordMessage(webhookUrl, message);
        verify(restTemplate, times(1)).postForEntity(eq(webhookUrl), any(Map.class), eq(String.class));
    }

    @Test
    void sendDiscordMessage_ApiThrowsError_CatchesExceptionSilently() {
        String webhookUrl = "https://discord.com/api/webhooks/hibas_url";
        String message = "Teszt üzenet";
        when(restTemplate.postForEntity(eq(webhookUrl), any(Map.class), eq(String.class)))
                .thenThrow(new RuntimeException("Connection Timeout"));
        notificationSenderService.sendDiscordMessage(webhookUrl, message);

        verify(restTemplate, times(1)).postForEntity(eq(webhookUrl), any(Map.class), eq(String.class));
    }
}
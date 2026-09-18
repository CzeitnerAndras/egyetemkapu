package com.egyetemkapu.service;

import com.egyetemkapu.config.TimeConfig;
import com.egyetemkapu.model.Settings;
import com.egyetemkapu.model.Task;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.SettingsRepository;
import com.egyetemkapu.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskNotificationServiceTest {

    private static final String WEBHOOK = "https://discord.com/api/webhooks/teszt";
    private static final String TELEGRAM_CHAT_ID = "123456789";
    private static final LocalDateTime DEADLINE = LocalDateTime.of(2026, 9, 1, 8, 0);

    @Mock
    private TaskRepository taskRepository;
    @Mock
    private SettingsRepository settingsRepository;
    @Mock
    private NotificationSenderService notificationSenderService;

    private User user;
    private Settings settings;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setUsername("teszt");

        settings = new Settings();
        settings.setUser(user);
        settings.setDiscordWebhook(WEBHOOK);
        settings.setTelegramChatId(TELEGRAM_CHAT_ID);
    }

    private TaskNotificationService serviceAt(int hour, int minute, int second, int nano) {
        Clock clock = Clock.fixed(
                ZonedDateTime.of(2026, 9, 1, hour, minute, second, nano, TimeConfig.APP_ZONE).toInstant(),
                TimeConfig.APP_ZONE
        );
        return new TaskNotificationService(taskRepository, settingsRepository, notificationSenderService, clock);
    }

    private Task taskWith(boolean pingOnDay, boolean pingDayBefore, int hoursBefore) {
        Task task = new Task();
        task.setTitle("Analízis zh");
        task.setTaskType("Vizsga");
        task.setDeadline(DEADLINE);
        task.setCompleted(false);
        task.setPingOnDay(pingOnDay);
        task.setPingDayBefore(pingDayBefore);
        task.setPingHoursBefore(hoursBefore);
        task.setUser(user);
        return task;
    }

    @Test
    void atDeadline_sendsDiscordPing() {
        Task task = taskWith(true, false, 24);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(8, 0, 0, 0).checkDeadlinesAndPing();

        verify(notificationSenderService).sendDiscordMessage(eq(WEBHOOK), contains("most lejár"));
    }

    @Test
    void oneMinuteBeforeDeadline_doesNotSendExactPing() {
        Task task = taskWith(true, false, 24);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));

        serviceAt(7, 59, 0, 0).checkDeadlinesAndPing();

        verify(notificationSenderService, never()).sendDiscordMessage(anyString(), anyString());
    }

    @Test
    void exactPingStillFiresIfSchedulerIsAFewSecondsLate() {
        Task task = taskWith(true, false, 24);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(8, 0, 12, 0).checkDeadlinesAndPing();

        verify(notificationSenderService).sendDiscordMessage(eq(WEBHOOK), contains("most lejár"));
    }

    @Test
    void utcSixOClockIsNotBudapestEightDeadline() {
        Task task = taskWith(true, false, 24);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));

        Clock utcSix = Clock.fixed(
                ZonedDateTime.of(2026, 9, 1, 6, 0, 0, 0, ZoneOffset.UTC).toInstant(),
                TimeConfig.APP_ZONE
        );
        new TaskNotificationService(taskRepository, settingsRepository, notificationSenderService, utcSix)
                .checkDeadlinesAndPing();

        verify(notificationSenderService, never()).sendDiscordMessage(anyString(), anyString());
    }

    @Test
    void customHoursBefore_sendsDiscordPing() {
        Task task = taskWith(false, true, 5);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(3, 0, 0, 0).checkDeadlinesAndPing();

        verify(notificationSenderService).sendDiscordMessage(eq(WEBHOOK), contains("5 óra múlva"));
    }

    @Test
    void slightlyBeforeHoursWindow_doesNotSendHoursPing() {
        Task task = taskWith(false, true, 2);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));

        serviceAt(5, 59, 0, 1_000_000).checkDeadlinesAndPing();

        verify(notificationSenderService, never()).sendDiscordMessage(anyString(), anyString());
    }

    @Test
    void hoursBeforePingStillFiresIfSchedulerIsAFewSecondsLate() {
        Task task = taskWith(false, true, 2);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(6, 0, 12, 0).checkDeadlinesAndPing();

        verify(notificationSenderService).sendDiscordMessage(eq(WEBHOOK), contains("2 óra múlva"));
    }

    @Test
    void twentyFourHoursBefore_sendsDiscordPing() {
        Task task = taskWith(false, true, 24);
        task.setDeadline(LocalDateTime.of(2026, 9, 2, 8, 0));
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(8, 0, 0, 0).checkDeadlinesAndPing();

        verify(notificationSenderService).sendDiscordMessage(eq(WEBHOOK), contains("24 óra múlva"));
    }

    @Test
    void englishPreference_sendsEnglishExactPing() {
        user.setPreferredLanguage("en");
        Task task = taskWith(true, false, 24);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(8, 0, 0, 0).checkDeadlinesAndPing();

        verify(notificationSenderService).sendDiscordMessage(eq(WEBHOOK), contains("due now"));
    }

    @Test
    void englishPreference_sendsEnglishHoursBeforePing() {
        user.setPreferredLanguage("en");
        Task task = taskWith(false, true, 1);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(7, 0, 0, 0).checkDeadlinesAndPing();

        verify(notificationSenderService).sendDiscordMessage(eq(WEBHOOK), contains("due in 1 hour"));
    }

    @Test
    void atDeadline_sendsTelegramPing() {
        Task task = taskWith(false, false, 24);
        task.setPingTelegramOnDay(true);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(8, 0, 0, 0).checkDeadlinesAndPing();

        verify(notificationSenderService).sendTelegramMessage(eq(TELEGRAM_CHAT_ID), contains("most lejár"));
        verify(notificationSenderService, never()).sendDiscordMessage(anyString(), anyString());
    }

    @Test
    void customHoursBefore_sendsTelegramPing() {
        Task task = taskWith(false, false, 3);
        task.setPingTelegramDayBefore(true);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(5, 0, 0, 0).checkDeadlinesAndPing();

        verify(notificationSenderService).sendTelegramMessage(eq(TELEGRAM_CHAT_ID), contains("3 óra múlva"));
    }

    @Test
    void invalidHoursBefore_doesNotSendHoursPing() {
        Task task = taskWith(false, true, 0);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));

        serviceAt(8, 0, 0, 0).checkDeadlinesAndPing();

        verify(notificationSenderService, never()).sendDiscordMessage(anyString(), anyString());
        verify(notificationSenderService, never()).sendTelegramMessage(anyString(), anyString());
    }

    @Test
    void clampPingHoursBefore_usesDefaultAndMax() {
        assertEquals(24, TaskNotificationService.clampPingHoursBefore(0));
        assertEquals(24, TaskNotificationService.clampPingHoursBefore(null));
        assertEquals(1, TaskNotificationService.clampPingHoursBefore(1));
        assertEquals(168, TaskNotificationService.clampPingHoursBefore(200));
    }
}

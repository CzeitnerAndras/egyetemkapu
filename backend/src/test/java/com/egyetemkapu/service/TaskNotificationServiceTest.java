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

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskNotificationServiceTest {

    private static final String WEBHOOK = "https://discord.com/api/webhooks/teszt";
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
    }

    private TaskNotificationService serviceAt(int hour, int minute, int second, int nano) {
        Clock clock = Clock.fixed(
                ZonedDateTime.of(2026, 9, 1, hour, minute, second, nano, TimeConfig.APP_ZONE).toInstant(),
                TimeConfig.APP_ZONE
        );
        return new TaskNotificationService(taskRepository, settingsRepository, notificationSenderService, clock);
    }

    private Task taskWith(boolean pingOnDay, boolean pingDayBefore) {
        Task task = new Task();
        task.setTitle("Analízis zh");
        task.setTaskType("Vizsga");
        task.setDeadline(DEADLINE);
        task.setCompleted(false);
        task.setPingOnDay(pingOnDay);
        task.setPingDayBefore(pingDayBefore);
        task.setUser(user);
        return task;
    }

    @Test
    void twoHoursBefore_sendsDiscordPing() {
        Task task = taskWith(true, false);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(6, 0, 0, 0).checkDeadlinesAndPing();

        verify(notificationSenderService).sendDiscordMessage(eq(WEBHOOK), contains("Analízis zh"));
    }

    @Test
    void oneMinuteBeforeDeadline_doesNotSendTwoHourPing() {
        Task task = taskWith(true, false);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));

        serviceAt(7, 59, 0, 0).checkDeadlinesAndPing();

        verify(notificationSenderService, never()).sendDiscordMessage(anyString(), anyString());
    }

    @Test
    void slightlyAfterFiveFiftyNine_doesNotCountAsTwoHoursBefore() {
        Task task = taskWith(true, false);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));

        serviceAt(5, 59, 0, 1_000_000).checkDeadlinesAndPing();

        verify(notificationSenderService, never()).sendDiscordMessage(anyString(), anyString());
    }

    @Test
    void twoHourPingStillFiresIfSchedulerIsAFewSecondsLate() {
        Task task = taskWith(true, false);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(6, 0, 12, 0).checkDeadlinesAndPing();

        verify(notificationSenderService).sendDiscordMessage(eq(WEBHOOK), contains("Analízis zh"));
    }

    @Test
    void utcSixOClockIsNotTwoHoursBeforeBudapestEight() {
        Task task = taskWith(true, false);
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
    void dayBefore_sendsDiscordPing() {
        Task task = taskWith(false, true);
        task.setDeadline(LocalDateTime.of(2026, 9, 2, 8, 0));
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(8, 0, 0, 0).checkDeadlinesAndPing();

        verify(notificationSenderService).sendDiscordMessage(eq(WEBHOOK), contains("holnap"));
    }

    @Test
    void englishPreference_sendsEnglishTwoHourPing() {
        user.setPreferredLanguage("en");
        Task task = taskWith(true, false);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(6, 0, 0, 0).checkDeadlinesAndPing();

        verify(notificationSenderService).sendDiscordMessage(eq(WEBHOOK), contains("due in 2 hours"));
    }
}

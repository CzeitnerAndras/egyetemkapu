package com.egyetemkapu.service;

import com.egyetemkapu.config.TimeConfig;
import com.egyetemkapu.model.ReminderChannel;
import com.egyetemkapu.model.ReminderKind;
import com.egyetemkapu.model.Settings;
import com.egyetemkapu.model.Task;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.SettingsRepository;
import com.egyetemkapu.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskNotificationServiceTest {

    private static final String WEBHOOK =
            "https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyzABCDEF123456";
    private static final String TELEGRAM_CHAT_ID = "123456789";
    private static final LocalDateTime DEADLINE = LocalDateTime.of(2026, 9, 1, 8, 0);

    @Mock
    private TaskRepository taskRepository;
    @Mock
    private SettingsRepository settingsRepository;
    @Mock
    private ReminderOutboxService reminderOutboxService;
    @Mock
    private ReminderDispatchService reminderDispatchService;

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
        return service(clock);
    }

    private TaskNotificationService service(Clock clock) {
        return new TaskNotificationService(
                taskRepository,
                settingsRepository,
                reminderOutboxService,
                reminderDispatchService,
                clock);
    }

    private Task taskWith(boolean pingOnDay, boolean pingDayBefore, int hoursBefore) {
        Task task = new Task();
        task.setId(7L);
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

    private ReminderDraft onlyDraft() {
        ArgumentCaptor<ReminderDraft> captor = ArgumentCaptor.forClass(ReminderDraft.class);
        verify(reminderOutboxService).enqueue(captor.capture(), any(LocalDateTime.class));
        return captor.getValue();
    }

    @Test
    void atDeadline_enqueuesDiscordPing() {
        Task task = taskWith(true, false, 24);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(8, 0, 0, 0).checkDeadlinesAndPing();

        ReminderDraft draft = onlyDraft();
        assertEquals(ReminderChannel.DISCORD, draft.channel());
        assertEquals(ReminderKind.AT_DEADLINE, draft.kind());
        assertTrue(draft.message().contains("most lejár"));
        assertEquals(
                "task:7:deadline:2026-09-01T08:00:kind:AT_DEADLINE:hours:0:channel:DISCORD",
                draft.idempotencyKey());
        verify(reminderDispatchService).dispatch(any(LocalDateTime.class));
    }

    @Test
    void oneMinuteBeforeDeadline_doesNotEnqueueExactPing() {
        Task task = taskWith(true, false, 24);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));

        serviceAt(7, 59, 0, 0).checkDeadlinesAndPing();

        verify(reminderOutboxService, never()).enqueue(any(), any());
        verify(reminderDispatchService).dispatch(any(LocalDateTime.class));
    }

    @Test
    void exactPingStillFiresIfSchedulerIsAFewSecondsLate() {
        Task task = taskWith(true, false, 24);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(8, 0, 12, 0).checkDeadlinesAndPing();

        assertTrue(onlyDraft().message().contains("most lejár"));
    }

    @Test
    void withinCatchUpWindow_stillEnqueues() {
        Task task = taskWith(true, false, 24);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(8, 59, 0, 0).checkDeadlinesAndPing();

        assertEquals(ReminderKind.AT_DEADLINE, onlyDraft().kind());
    }

    @Test
    void afterCatchUpWindow_doesNotEnqueue() {
        Task task = taskWith(true, false, 24);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));

        serviceAt(9, 0, 0, 0).checkDeadlinesAndPing();

        verify(reminderOutboxService, never()).enqueue(any(), any());
    }

    @Test
    void taskCreatedAfterTheDueMinute_isNotCaughtUp() {
        Task task = taskWith(true, false, 24);
        task.setCreatedAt(DEADLINE.plusMinutes(5));
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));

        serviceAt(8, 30, 0, 0).checkDeadlinesAndPing();

        verify(reminderOutboxService, never()).enqueue(any(), any());
    }

    @Test
    void utcSixOClockIsNotBudapestEightDeadline() {
        Task task = taskWith(true, false, 24);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));

        Clock utcSix = Clock.fixed(
                ZonedDateTime.of(2026, 9, 1, 6, 0, 0, 0, ZoneOffset.UTC).toInstant(),
                TimeConfig.APP_ZONE
        );
        service(utcSix).checkDeadlinesAndPing();

        verify(reminderOutboxService, never()).enqueue(any(), any());
    }

    @Test
    void customHoursBefore_enqueuesDiscordPing() {
        Task task = taskWith(false, true, 5);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(3, 0, 0, 0).checkDeadlinesAndPing();

        ReminderDraft draft = onlyDraft();
        assertEquals(ReminderKind.HOURS_BEFORE, draft.kind());
        assertEquals(5, draft.hoursBefore());
        assertTrue(draft.message().contains("5 óra múlva"));
        assertTrue(draft.idempotencyKey().contains("hours:5"));
    }

    @Test
    void slightlyBeforeHoursWindow_doesNotEnqueueHoursPing() {
        Task task = taskWith(false, true, 2);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));

        serviceAt(5, 59, 0, 1_000_000).checkDeadlinesAndPing();

        verify(reminderOutboxService, never()).enqueue(any(), any());
    }

    @Test
    void hoursBeforePingStillFiresIfSchedulerIsAFewSecondsLate() {
        Task task = taskWith(false, true, 2);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(6, 0, 12, 0).checkDeadlinesAndPing();

        assertTrue(onlyDraft().message().contains("2 óra múlva"));
    }

    @Test
    void hoursBeforePingIsNotQueuedOnceTheDeadlineMinuteArrives() {
        Task task = taskWith(false, true, 1);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));

        serviceAt(8, 0, 0, 0).checkDeadlinesAndPing();

        verify(reminderOutboxService, never()).enqueue(any(), any());
    }

    @Test
    void hoursBeforeStillCaughtUpBeforeTheDeadline() {
        Task task = taskWith(false, true, 2);
        task.setDeadline(LocalDateTime.of(2026, 9, 1, 10, 0));
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(8, 20, 0, 0).checkDeadlinesAndPing();

        ReminderDraft draft = onlyDraft();
        assertEquals(ReminderKind.HOURS_BEFORE, draft.kind());
        assertTrue(draft.message().contains("2 óra múlva"));
    }

    @Test
    void taskCreatedAfterTheHoursWindow_isNotCaughtUp() {
        Task task = taskWith(false, true, 2);
        task.setDeadline(LocalDateTime.of(2026, 9, 1, 10, 0));
        task.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 30));
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));

        serviceAt(8, 45, 0, 0).checkDeadlinesAndPing();

        verify(reminderOutboxService, never()).enqueue(any(), any());
    }

    @Test
    void twentyFourHoursBefore_enqueuesDiscordPing() {
        Task task = taskWith(false, true, 24);
        task.setDeadline(LocalDateTime.of(2026, 9, 2, 8, 0));
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(8, 0, 0, 0).checkDeadlinesAndPing();

        assertTrue(onlyDraft().message().contains("24 óra múlva"));
    }

    @Test
    void englishPreference_enqueuesEnglishExactPing() {
        user.setPreferredLanguage("en");
        Task task = taskWith(true, false, 24);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(8, 0, 0, 0).checkDeadlinesAndPing();

        assertTrue(onlyDraft().message().contains("due now"));
    }

    @Test
    void englishPreference_enqueuesEnglishHoursBeforePing() {
        user.setPreferredLanguage("en");
        Task task = taskWith(false, true, 1);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(7, 0, 0, 0).checkDeadlinesAndPing();

        assertTrue(onlyDraft().message().contains("due in 1 hour"));
    }

    @Test
    void englishPreference_usesPluralHours() {
        user.setPreferredLanguage("EN");
        Task task = taskWith(false, true, 5);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(3, 0, 0, 0).checkDeadlinesAndPing();

        assertTrue(onlyDraft().message().contains("due in 5 hours"));
    }

    @Test
    void atDeadline_enqueuesTelegramPing() {
        Task task = taskWith(false, false, 24);
        task.setPingTelegramOnDay(true);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(8, 0, 0, 0).checkDeadlinesAndPing();

        ReminderDraft draft = onlyDraft();
        assertEquals(ReminderChannel.TELEGRAM, draft.channel());
        assertTrue(draft.message().contains("most lejár"));
    }

    @Test
    void atDeadline_enqueuesBothChannels() {
        Task task = taskWith(true, false, 24);
        task.setPingTelegramOnDay(true);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(8, 0, 0, 0).checkDeadlinesAndPing();

        ArgumentCaptor<ReminderDraft> captor = ArgumentCaptor.forClass(ReminderDraft.class);
        verify(reminderOutboxService, org.mockito.Mockito.times(2))
                .enqueue(captor.capture(), any(LocalDateTime.class));
        assertEquals(
                Set.of(ReminderChannel.DISCORD, ReminderChannel.TELEGRAM),
                captor.getAllValues().stream().map(ReminderDraft::channel).collect(Collectors.toSet()));
    }

    @Test
    void customHoursBefore_enqueuesTelegramPing() {
        Task task = taskWith(false, false, 3);
        task.setPingTelegramDayBefore(true);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(5, 0, 0, 0).checkDeadlinesAndPing();

        ReminderDraft draft = onlyDraft();
        assertEquals(ReminderChannel.TELEGRAM, draft.channel());
        assertTrue(draft.message().contains("3 óra múlva"));
    }

    @Test
    void invalidHoursBefore_doesNotEnqueueHoursPing() {
        Task task = taskWith(false, true, 0);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));

        serviceAt(8, 0, 0, 0).checkDeadlinesAndPing();

        verify(reminderOutboxService, never()).enqueue(any(), any());
    }

    @Test
    void rejectedWebhook_isNotEnqueued() {
        settings.setDiscordWebhook("https://evil.example/hook");
        settings.setTelegramChatId(null);
        Task task = taskWith(true, false, 24);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        serviceAt(8, 0, 0, 0).checkDeadlinesAndPing();

        verify(reminderOutboxService, never()).enqueue(any(), any());
    }

    @Test
    void enqueueFailure_stillDispatchesRetries() {
        Task task = taskWith(true, false, 24);
        when(taskRepository.findAllByCompletedFalse()).thenReturn(List.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));
        when(reminderOutboxService.enqueue(any(), any())).thenThrow(new IllegalStateException("db"));

        serviceAt(8, 0, 0, 0).checkDeadlinesAndPing();

        verify(reminderDispatchService).dispatch(any(LocalDateTime.class));
    }

    @Test
    void clampPingHoursBefore_usesDefaultAndMax() {
        assertEquals(24, TaskNotificationService.clampPingHoursBefore(0));
        assertEquals(24, TaskNotificationService.clampPingHoursBefore(null));
        assertEquals(1, TaskNotificationService.clampPingHoursBefore(1));
        assertEquals(168, TaskNotificationService.clampPingHoursBefore(200));
    }
}

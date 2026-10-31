package com.egyetemkapu.service;

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
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReminderDispatchServiceTest {

    private static final String WEBHOOK =
            "https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyzABCDEF123456";
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 9, 1, 8, 0, 5);
    private static final LocalDateTime DEADLINE = LocalDateTime.of(2026, 9, 1, 8, 0);

    @Mock
    private ReminderOutboxService outbox;
    @Mock
    private TaskRepository taskRepository;
    @Mock
    private SettingsRepository settingsRepository;
    @Mock
    private NotificationSenderService notificationSenderService;

    private User user;
    private Settings settings;
    private Task task;
    private ReminderDispatchService service;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);

        settings = new Settings();
        settings.setUser(user);
        settings.setDiscordWebhook(WEBHOOK);
        settings.setTelegramChatId("123456789");

        task = new Task();
        task.setId(7L);
        task.setTitle("Analízis zh");
        task.setTaskType("Vizsga");
        task.setDeadline(DEADLINE);
        task.setCompleted(false);
        task.setPingOnDay(true);
        task.setPingDayBefore(true);
        task.setPingHoursBefore(5);
        task.setUser(user);

        service = new ReminderDispatchService(outbox, taskRepository, settingsRepository, notificationSenderService);
    }

    @Test
    void sendsClaimedDiscordReminder() {
        when(outbox.claim(NOW)).thenReturn(List.of(claimed(ReminderChannel.DISCORD, ReminderKind.AT_DEADLINE, 0)));
        when(taskRepository.findById(7L)).thenReturn(Optional.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));
        when(notificationSenderService.deliverDiscord(WEBHOOK, "most lejár")).thenReturn(DeliveryResult.sent());

        service.dispatch(NOW);

        verify(outbox).markSent(4L, NOW);
        verify(outbox, never()).markFailure(anyLong(), any(), any());
    }

    @Test
    void usesTheWebhookSavedAtSendTime() {
        settings.setDiscordWebhook(
                "https://discord.com/api/webhooks/123456789012345678/rotatedTokenRotatedTokenRotated");
        when(outbox.claim(NOW)).thenReturn(List.of(claimed(ReminderChannel.DISCORD, ReminderKind.AT_DEADLINE, 0)));
        when(taskRepository.findById(7L)).thenReturn(Optional.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));
        when(notificationSenderService.deliverDiscord(settings.getDiscordWebhook(), "most lejár"))
                .thenReturn(DeliveryResult.sent());

        service.dispatch(NOW);

        verify(notificationSenderService).deliverDiscord(settings.getDiscordWebhook(), "most lejár");
    }

    @Test
    void retryableFailureStaysInTheOutbox() {
        when(outbox.claim(NOW)).thenReturn(List.of(claimed(ReminderChannel.DISCORD, ReminderKind.AT_DEADLINE, 0)));
        when(taskRepository.findById(7L)).thenReturn(Optional.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));
        DeliveryResult retry = DeliveryResult.retry("discord 503");
        when(notificationSenderService.deliverDiscord(WEBHOOK, "most lejár")).thenReturn(retry);

        service.dispatch(NOW);

        verify(outbox).markFailure(4L, retry, NOW);
        verify(outbox, never()).markSent(anyLong(), any());
    }

    @Test
    void completedTaskIsCancelledWithoutSending() {
        task.setCompleted(true);
        when(outbox.claim(NOW)).thenReturn(List.of(claimed(ReminderChannel.DISCORD, ReminderKind.AT_DEADLINE, 0)));
        when(taskRepository.findById(7L)).thenReturn(Optional.of(task));

        service.dispatch(NOW);

        verify(outbox).markCancelled(4L, ReminderDispatchService.TASK_COMPLETED, NOW);
        verify(notificationSenderService, never()).deliverDiscord(anyString(), anyString());
    }

    @Test
    void movedDeadlineIsCancelled() {
        task.setDeadline(DEADLINE.plusHours(2));
        when(outbox.claim(NOW)).thenReturn(List.of(claimed(ReminderChannel.DISCORD, ReminderKind.AT_DEADLINE, 0)));
        when(taskRepository.findById(7L)).thenReturn(Optional.of(task));

        service.dispatch(NOW);

        verify(outbox).markCancelled(4L, ReminderDispatchService.DEADLINE_CHANGED, NOW);
        verify(notificationSenderService, never()).deliverDiscord(anyString(), anyString());
    }

    @Test
    void disabledPingIsCancelled() {
        task.setPingDayBefore(false);
        when(outbox.claim(NOW)).thenReturn(List.of(claimed(ReminderChannel.DISCORD, ReminderKind.HOURS_BEFORE, 5)));
        when(taskRepository.findById(7L)).thenReturn(Optional.of(task));

        service.dispatch(NOW);

        verify(outbox).markCancelled(4L, ReminderDispatchService.PING_DISABLED, NOW);
    }

    @Test
    void changedHoursAreCancelled() {
        task.setPingHoursBefore(2);
        when(outbox.claim(NOW)).thenReturn(List.of(claimed(ReminderChannel.DISCORD, ReminderKind.HOURS_BEFORE, 5)));
        when(taskRepository.findById(7L)).thenReturn(Optional.of(task));

        service.dispatch(NOW);

        verify(outbox).markCancelled(eq(4L), eq(ReminderDispatchService.HOURS_CHANGED), eq(NOW));
    }

    @Test
    void missingWebhookIsCancelled() {
        settings.setDiscordWebhook(null);
        when(outbox.claim(NOW)).thenReturn(List.of(claimed(ReminderChannel.DISCORD, ReminderKind.AT_DEADLINE, 0)));
        when(taskRepository.findById(7L)).thenReturn(Optional.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        service.dispatch(NOW);

        verify(outbox).markCancelled(4L, ReminderDispatchService.NO_DESTINATION, NOW);
        verify(notificationSenderService, never()).deliverDiscord(anyString(), anyString());
    }

    @Test
    void senderExceptionIsRecordedAsRetry() {
        when(outbox.claim(NOW)).thenReturn(List.of(claimed(ReminderChannel.TELEGRAM, ReminderKind.AT_DEADLINE, 0)));
        task.setPingTelegramOnDay(true);
        when(taskRepository.findById(7L)).thenReturn(Optional.of(task));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));
        when(notificationSenderService.deliverTelegram("123456789", "most lejár"))
                .thenThrow(new IllegalStateException("boom"));

        service.dispatch(NOW);

        verify(outbox).markFailure(eq(4L), eq(DeliveryResult.retry("IllegalStateException")), eq(NOW));
    }

    private static ClaimedReminder claimed(ReminderChannel channel, ReminderKind kind, int hours) {
        return new ClaimedReminder(4L, 7L, 1L, channel, kind, hours, DEADLINE, "most lejár");
    }
}

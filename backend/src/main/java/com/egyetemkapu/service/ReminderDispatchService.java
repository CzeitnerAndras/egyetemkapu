package com.egyetemkapu.service;

import com.egyetemkapu.model.ReminderChannel;
import com.egyetemkapu.model.ReminderKind;
import com.egyetemkapu.model.Settings;
import com.egyetemkapu.model.Task;
import com.egyetemkapu.repository.SettingsRepository;
import com.egyetemkapu.repository.TaskRepository;
import com.egyetemkapu.security.DiscordWebhookValidator;
import com.egyetemkapu.security.TelegramChatIdValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Service
public class ReminderDispatchService {

    static final String TASK_MISSING = "task missing";
    static final String TASK_COMPLETED = "task completed";
    static final String DEADLINE_CHANGED = "deadline changed";
    static final String PING_DISABLED = "ping disabled";
    static final String HOURS_CHANGED = "hours changed";
    static final String NO_DESTINATION = "no destination";

    private static final Logger log = LoggerFactory.getLogger(ReminderDispatchService.class);

    private final ReminderOutboxService outbox;
    private final TaskRepository taskRepository;
    private final SettingsRepository settingsRepository;
    private final NotificationSenderService notificationSenderService;

    public ReminderDispatchService(
            ReminderOutboxService outbox,
            TaskRepository taskRepository,
            SettingsRepository settingsRepository,
            NotificationSenderService notificationSenderService) {
        this.outbox = outbox;
        this.taskRepository = taskRepository;
        this.settingsRepository = settingsRepository;
        this.notificationSenderService = notificationSenderService;
    }

    // --- Drain ---
    public void dispatch(LocalDateTime now) {
        for (ClaimedReminder claimed : outbox.claim(now)) {
            deliver(claimed, now);
        }
    }

    private void deliver(ClaimedReminder claimed, LocalDateTime now) {
        try {
            String cancel = cancellation(claimed);
            if (cancel != null) {
                outbox.markCancelled(claimed.id(), cancel, now);
                return;
            }
            DeliveryResult result = send(claimed);
            if (result.outcome() == DeliveryOutcome.SENT) {
                outbox.markSent(claimed.id(), now);
                log.info("Sent reminder {} via {}", claimed.id(), claimed.channel());
                return;
            }
            outbox.markFailure(claimed.id(), result, now);
            log.warn("Reminder {} not sent ({})", claimed.id(), result.error());
        } catch (RuntimeException ex) {
            log.warn("Reminder {} failed ({})", claimed.id(), ex.getClass().getSimpleName());
            try {
                outbox.markFailure(claimed.id(), DeliveryResult.retry(ex.getClass().getSimpleName()), now);
            } catch (RuntimeException markFailed) {
                log.warn("Could not record failure for reminder {} ({})",
                        claimed.id(), markFailed.getClass().getSimpleName());
            }
        }
    }

    private String cancellation(ClaimedReminder claimed) {
        Task task = taskRepository.findById(claimed.taskId()).orElse(null);
        if (task == null) {
            return TASK_MISSING;
        }
        if (task.isCompleted()) {
            return TASK_COMPLETED;
        }
        if (task.getDeadline() == null
                || !task.getDeadline().truncatedTo(ChronoUnit.MINUTES).equals(claimed.deadline())) {
            return DEADLINE_CHANGED;
        }
        if (!pingStillEnabled(task, claimed)) {
            return PING_DISABLED;
        }
        if (claimed.kind() == ReminderKind.HOURS_BEFORE && !hoursStillMatch(task, claimed)) {
            return HOURS_CHANGED;
        }
        if (task.getUser() == null
                || destination(settingsRepository.findByUser(task.getUser()).orElse(null), claimed.channel()) == null) {
            return NO_DESTINATION;
        }
        return null;
    }

    private DeliveryResult send(ClaimedReminder claimed) {
        Task task = taskRepository.findById(claimed.taskId()).orElse(null);
        if (task == null || task.getUser() == null) {
            return DeliveryResult.permanent(NO_DESTINATION);
        }
        Settings settings = settingsRepository.findByUser(task.getUser()).orElse(null);
        String destination = destination(settings, claimed.channel());
        if (destination == null) {
            return DeliveryResult.permanent(NO_DESTINATION);
        }
        if (claimed.channel() == ReminderChannel.DISCORD) {
            return notificationSenderService.deliverDiscord(destination, claimed.message());
        }
        return notificationSenderService.deliverTelegram(destination, claimed.message());
    }

    private static boolean pingStillEnabled(Task task, ClaimedReminder claimed) {
        boolean atDeadline = claimed.kind() == ReminderKind.AT_DEADLINE;
        if (claimed.channel() == ReminderChannel.DISCORD) {
            return atDeadline ? task.isPingOnDay() : task.isPingDayBefore();
        }
        return atDeadline ? task.isPingTelegramOnDay() : task.isPingTelegramDayBefore();
    }

    private static boolean hoursStillMatch(Task task, ClaimedReminder claimed) {
        return task.getPingHoursBefore() != null && task.getPingHoursBefore() == claimed.hoursBefore();
    }

    private static String destination(Settings settings, ReminderChannel channel) {
        if (settings == null) {
            return null;
        }
        if (channel == ReminderChannel.DISCORD) {
            String webhook = settings.getDiscordWebhook();
            if (!DiscordWebhookValidator.isAllowed(webhook)) {
                return null;
            }
            return webhook.trim();
        }
        return TelegramChatIdValidator.normalize(settings.getTelegramChatId());
    }
}

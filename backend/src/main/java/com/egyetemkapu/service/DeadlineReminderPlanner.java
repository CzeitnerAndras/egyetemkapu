package com.egyetemkapu.service;

import com.egyetemkapu.model.ReminderChannel;
import com.egyetemkapu.model.ReminderKind;
import com.egyetemkapu.model.Settings;
import com.egyetemkapu.model.Task;
import com.egyetemkapu.security.DiscordWebhookValidator;
import com.egyetemkapu.security.TelegramChatIdValidator;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

final class DeadlineReminderPlanner {

    static final int CATCH_UP_MINUTES = 60;
    static final int MESSAGE_LIMIT = 1000;

    private DeadlineReminderPlanner() {
    }

    // --- Due reminders ---
    static boolean windowOpen(Task task, LocalDateTime now) {
        if (task == null || task.getDeadline() == null || now == null) {
            return false;
        }
        LocalDateTime nowMinute = now.truncatedTo(ChronoUnit.MINUTES);
        LocalDateTime deadlineMinute = task.getDeadline().truncatedTo(ChronoUnit.MINUTES);
        if ((task.isPingOnDay() || task.isPingTelegramOnDay())
                && isDue(nowMinute, deadlineMinute, deadlineMinute, true)
                && !createdAfterDue(task, deadlineMinute)) {
            return true;
        }
        int hours = task.getPingHoursBefore() == null ? 0 : task.getPingHoursBefore();
        if (!isValidHours(hours) || (!task.isPingDayBefore() && !task.isPingTelegramDayBefore())) {
            return false;
        }
        LocalDateTime due = deadlineMinute.minusHours(hours);
        return isDue(nowMinute, due, deadlineMinute, false) && !createdAfterDue(task, due);
    }

    static List<ReminderDraft> plan(Task task, Settings settings, LocalDateTime now) {
        if (task == null || task.getId() == null || task.getDeadline() == null
                || task.getUser() == null || task.getUser().getId() == null || settings == null || now == null) {
            return List.of();
        }

        LocalDateTime nowMinute = now.truncatedTo(ChronoUnit.MINUTES);
        LocalDateTime deadlineMinute = task.getDeadline().truncatedTo(ChronoUnit.MINUTES);
        List<ReminderDraft> drafts = new ArrayList<>();

        if (isDue(nowMinute, deadlineMinute, deadlineMinute, true) && !createdAfterDue(task, deadlineMinute)) {
            add(drafts, task, settings, deadlineMinute, ReminderKind.AT_DEADLINE, 0,
                    DeadlinePingMessages.atDeadline(
                            task.getUser().getPreferredLanguage(), task.getTitle(), task.getTaskType()));
        }

        int hours = task.getPingHoursBefore() == null ? 0 : task.getPingHoursBefore();
        if (isValidHours(hours)) {
            LocalDateTime due = deadlineMinute.minusHours(hours);
            if (isDue(nowMinute, due, deadlineMinute, false) && !createdAfterDue(task, due)) {
                add(drafts, task, settings, deadlineMinute, ReminderKind.HOURS_BEFORE, hours,
                        DeadlinePingMessages.hoursBefore(
                                task.getUser().getPreferredLanguage(), task.getTitle(), task.getTaskType(), hours));
            }
        }
        return drafts;
    }

    static String idempotencyKey(
            long taskId,
            LocalDateTime deadlineMinute,
            ReminderKind kind,
            int hours,
            ReminderChannel channel) {
        int hoursPart = kind == ReminderKind.AT_DEADLINE ? 0 : hours;
        return "task:" + taskId
                + ":deadline:" + deadlineMinute
                + ":kind:" + kind.name()
                + ":hours:" + hoursPart
                + ":channel:" + channel.name();
    }

    // --- Window ---
    private static boolean isDue(
            LocalDateTime nowMinute,
            LocalDateTime dueMinute,
            LocalDateTime deadlineMinute,
            boolean atDeadline) {
        if (nowMinute.isBefore(dueMinute)) {
            return false;
        }
        if (!nowMinute.isBefore(dueMinute.plusMinutes(CATCH_UP_MINUTES))) {
            return false;
        }
        return atDeadline || nowMinute.isBefore(deadlineMinute);
    }

    private static boolean createdAfterDue(Task task, LocalDateTime dueMinute) {
        if (task.getCreatedAt() == null) {
            return false;
        }
        return task.getCreatedAt().truncatedTo(ChronoUnit.MINUTES).isAfter(dueMinute);
    }

    private static boolean isValidHours(int hours) {
        return hours >= TaskNotificationService.MIN_PING_HOURS_BEFORE
                && hours <= TaskNotificationService.MAX_PING_HOURS_BEFORE;
    }

    private static void add(
            List<ReminderDraft> drafts,
            Task task,
            Settings settings,
            LocalDateTime deadlineMinute,
            ReminderKind kind,
            int hours,
            String message) {
        boolean atDeadline = kind == ReminderKind.AT_DEADLINE;
        String text = limit(message);
        if (wantsDiscord(task, atDeadline) && DiscordWebhookValidator.isAllowed(settings.getDiscordWebhook())) {
            drafts.add(draft(task, deadlineMinute, ReminderChannel.DISCORD, kind, hours, text));
        }
        if (wantsTelegram(task, atDeadline) && TelegramChatIdValidator.isAllowed(settings.getTelegramChatId())) {
            drafts.add(draft(task, deadlineMinute, ReminderChannel.TELEGRAM, kind, hours, text));
        }
    }

    private static boolean wantsDiscord(Task task, boolean atDeadline) {
        return atDeadline ? task.isPingOnDay() : task.isPingDayBefore();
    }

    private static boolean wantsTelegram(Task task, boolean atDeadline) {
        return atDeadline ? task.isPingTelegramOnDay() : task.isPingTelegramDayBefore();
    }

    private static ReminderDraft draft(
            Task task,
            LocalDateTime deadlineMinute,
            ReminderChannel channel,
            ReminderKind kind,
            int hours,
            String message) {
        return new ReminderDraft(
                idempotencyKey(task.getId(), deadlineMinute, kind, hours, channel),
                task.getId(),
                task.getUser().getId(),
                channel,
                kind,
                hours,
                deadlineMinute,
                message);
    }

    private static String limit(String message) {
        if (message == null) {
            return "";
        }
        if (message.length() <= MESSAGE_LIMIT) {
            return message;
        }
        return message.substring(0, MESSAGE_LIMIT);
    }
}

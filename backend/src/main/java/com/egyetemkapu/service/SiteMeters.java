package com.egyetemkapu.service;

import com.egyetemkapu.model.ReminderKind;
import com.egyetemkapu.model.ReminderOutbox;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;

@Component
public class SiteMeters {

    private final Timer authRefresh;
    private final Timer reminderLag;
    private final Counter flyerSyncOk;
    private final Counter flyerSyncFailed;

    public SiteMeters(MeterRegistry registry) {
        this.authRefresh = Timer.builder("auth.refresh")
                .description("Time to rotate a refresh token")
                .register(registry);
        this.reminderLag = Timer.builder("reminder.lag")
                .description("How late a deadline ping was sent after it became due")
                .register(registry);
        this.flyerSyncOk = Counter.builder("flyer.sync")
                .tag("result", "ok")
                .register(registry);
        this.flyerSyncFailed = Counter.builder("flyer.sync")
                .tag("result", "failed")
                .register(registry);
    }

    public void recordRefresh(Duration elapsed) {
        authRefresh.record(elapsed);
    }

    public void reminderSent(ReminderOutbox row, LocalDateTime sentAt) {
        reminderLag.record(lag(row.getKind(), row.getDeadline(), row.getHoursBefore(), sentAt));
    }

    public void flyerSync(boolean ok) {
        if (ok) {
            flyerSyncOk.increment();
        } else {
            flyerSyncFailed.increment();
        }
    }

    static Duration lag(ReminderKind kind, LocalDateTime deadline, int hoursBefore, LocalDateTime sentAt) {
        if (deadline == null || sentAt == null) {
            return Duration.ZERO;
        }
        LocalDateTime due = kind == ReminderKind.HOURS_BEFORE ? deadline.minusHours(hoursBefore) : deadline;
        Duration late = Duration.between(due, sentAt);
        return late.isNegative() ? Duration.ZERO : late;
    }
}

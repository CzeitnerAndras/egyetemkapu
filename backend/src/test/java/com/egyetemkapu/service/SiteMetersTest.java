package com.egyetemkapu.service;

import com.egyetemkapu.model.ReminderKind;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SiteMetersTest {

    private static final LocalDateTime DEADLINE = LocalDateTime.of(2026, 9, 1, 8, 0);

    @Test
    void deadlinePingLagIsHowLateTheSendWas() {
        assertEquals(Duration.ofMinutes(12), SiteMeters.lag(
                ReminderKind.AT_DEADLINE, DEADLINE, 0, DEADLINE.plusMinutes(12)));
    }

    @Test
    void earlyWarningLagUsesTheHoursBeforeMoment() {
        assertEquals(Duration.ofMinutes(4), SiteMeters.lag(
                ReminderKind.HOURS_BEFORE, DEADLINE, 5, DEADLINE.minusHours(5).plusMinutes(4)));
    }

    @Test
    void anEarlySendIsNotNegativeLag() {
        assertEquals(Duration.ZERO, SiteMeters.lag(
                ReminderKind.AT_DEADLINE, DEADLINE, 0, DEADLINE.minusMinutes(1)));
    }
}

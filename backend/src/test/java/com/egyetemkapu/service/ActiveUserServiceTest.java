package com.egyetemkapu.service;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ActiveUserServiceTest {

    private static final String VISITOR_A = "11111111-1111-4111-8111-111111111111";
    private static final String VISITOR_B = "22222222-2222-4222-8222-222222222222";

    @Test
    void heartbeat_countsDistinctVisitors() {
        ActiveUserService service = new ActiveUserService(Clock.fixed(Instant.parse("2026-09-18T08:00:00Z"), ZoneOffset.UTC));

        service.heartbeat(VISITOR_A);
        service.heartbeat(VISITOR_A);
        service.heartbeat(VISITOR_B);

        assertEquals(2, service.countActive());
    }

    @Test
    void invalidVisitorId_isIgnored() {
        ActiveUserService service = new ActiveUserService(Clock.fixed(Instant.parse("2026-09-18T08:00:00Z"), ZoneOffset.UTC));

        service.heartbeat("not-a-uuid");
        service.heartbeat(" ");
        service.heartbeat(null);

        assertEquals(0, service.countActive());
        assertFalse(ActiveUserService.isValidVisitorId("abc"));
        assertTrue(ActiveUserService.isValidVisitorId(VISITOR_A));
    }

    @Test
    void expiredVisitors_areDropped() {
        MutableClock clock = new MutableClock(Instant.parse("2026-09-18T08:00:00Z"));
        ActiveUserService service = new ActiveUserService(clock);

        service.heartbeat(VISITOR_A);
        service.heartbeat(VISITOR_B);
        assertEquals(2, service.countActive());

        clock.setInstant(clock.instant().plus(ActiveUserService.ACTIVE_WINDOW).minusSeconds(1));
        assertEquals(2, service.countActive());

        clock.setInstant(clock.instant().plus(Duration.ofSeconds(2)));
        assertEquals(0, service.countActive());
    }

    private static final class MutableClock extends Clock {
        private Instant instant;

        private MutableClock(Instant instant) {
            this.instant = instant;
        }

        void setInstant(Instant instant) {
            this.instant = instant;
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return Clock.fixed(instant, zone);
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}

package com.egyetemkapu.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class FlashcardSchedulerTest {

    private final LocalDateTime now = LocalDateTime.of(2026, 9, 29, 12, 0);

    @Test
    void againResetsTheIntervalAndComesBackInTenMinutes() {
        FlashcardScheduler.NextReview next = FlashcardScheduler.schedule(8, "Again", now);

        assertEquals(0, next.intervalDays());
        assertEquals(now.plusMinutes(10), next.dueAt());
    }

    @Test
    void firstGoodAnswerIsDueTomorrow() {
        FlashcardScheduler.NextReview next = FlashcardScheduler.schedule(0, "good", now);

        assertEquals(1, next.intervalDays());
        assertEquals(now.plusDays(1), next.dueAt());
    }

    @Test
    void laterGoodAnswersDoubleUntilSixtyDays() {
        assertEquals(4, FlashcardScheduler.schedule(2, "good", now).intervalDays());
        assertEquals(60, FlashcardScheduler.schedule(40, "good", now).intervalDays());
        assertEquals(60, FlashcardScheduler.schedule(60, "good", now).intervalDays());
    }

    @Test
    void unknownRatingIsRejected() {
        assertThrows(IllegalArgumentException.class, () -> FlashcardScheduler.schedule(1, "easy", now));
        assertThrows(IllegalArgumentException.class, () -> FlashcardScheduler.schedule(1, null, now));
        assertThrows(IllegalArgumentException.class, () -> FlashcardScheduler.schedule(1, "good", null));
    }

    @Test
    void aNegativeIntervalStillStartsAtOneDay() {
        FlashcardScheduler.NextReview next = FlashcardScheduler.schedule(-3, "good", now);

        assertEquals(1, next.intervalDays());
        assertEquals(now.plusDays(1), next.dueAt());
    }
}

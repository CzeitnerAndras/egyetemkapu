package com.egyetemkapu.service;

import com.egyetemkapu.dto.DeadLetterQueueDto;
import com.egyetemkapu.dto.FlyerSyncRunDto;
import com.egyetemkapu.model.ReminderChannel;
import com.egyetemkapu.model.ReminderKind;
import com.egyetemkapu.model.ReminderOutbox;
import com.egyetemkapu.model.ReminderStatus;
import com.egyetemkapu.repository.ReminderOutboxRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DeadLetterServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-29T05:00:00Z"), ZoneOffset.UTC);
    private static final LocalDateTime NOW = LocalDateTime.now(CLOCK);

    @Mock private ReminderOutboxRepository reminderOutboxRepository;
    @Mock private ReminderOutboxService reminderOutboxService;
    @Mock private ReminderDispatchService reminderDispatchService;
    @Mock private FlyerSyncLog flyerSyncLog;
    @Mock private FlyerSyncService flyerSyncService;

    private DeadLetterService service;

    @BeforeEach
    void setUp() {
        service = new DeadLetterService(
                reminderOutboxRepository,
                reminderOutboxService,
                reminderDispatchService,
                flyerSyncLog,
                flyerSyncService,
                CLOCK);
    }

    @Test
    void listsDeadRemindersAndOnlyFailedFlyerSyncs() {
        ReminderOutbox row = new ReminderOutbox();
        row.setId(4L);
        row.setChannel(ReminderChannel.DISCORD);
        row.setKind(ReminderKind.AT_DEADLINE);
        row.setAttempts(5);
        row.setLastError("discord 503");
        row.setDeadline(LocalDateTime.of(2026, 9, 1, 8, 0));
        row.setMessage("  hello   world  " + "x".repeat(200));
        when(reminderOutboxRepository.findTop50ByStatusOrderByIdDesc(ReminderStatus.DEAD)).thenReturn(List.of(row));
        when(flyerSyncLog.latest()).thenReturn(List.of(
                new FlyerSyncRunDto("aldi", "ok", NOW, NOW, 10, null),
                new FlyerSyncRunDto("spar", "failed", NOW, NOW.plusMinutes(1), 0, "spar down"),
                new FlyerSyncRunDto("coop", "never", null, null, 0, null)));

        DeadLetterQueueDto queue = service.list();

        assertEquals(1, queue.reminders().size());
        assertEquals("discord 503", queue.reminders().getFirst().lastError());
        assertEquals(180, queue.reminders().getFirst().message().length());
        assertTrue(queue.reminders().getFirst().message().startsWith("hello world "));
        assertEquals(List.of("spar"), queue.flyerSyncs().stream().map(sync -> sync.store()).toList());
        assertEquals("spar down", queue.flyerSyncs().getFirst().lastError());
    }

    @Test
    void requeuedReminderIsDispatchedImmediately() {
        when(reminderOutboxService.retryDead(4L, NOW)).thenReturn(ReminderRetry.REQUEUED);

        assertEquals(ReminderRetry.REQUEUED, service.retryReminder(4L));

        verify(reminderDispatchService).dispatch(NOW);
    }

    @Test
    void otherRetryResultsLeaveTheQueueAlone() {
        for (ReminderRetry result : List.of(
                ReminderRetry.ALREADY_QUEUED,
                ReminderRetry.ALREADY_SENT,
                ReminderRetry.IN_FLIGHT,
                ReminderRetry.NOT_DEAD,
                ReminderRetry.NOT_FOUND)) {
            when(reminderOutboxService.retryDead(4L, NOW)).thenReturn(result);
            assertEquals(result, service.retryReminder(4L));
        }

        verify(reminderDispatchService, never()).dispatch(NOW);
    }

    @Test
    void flyerRetryRunsOnlyAfterTheStoreIsReserved() {
        when(flyerSyncService.reserveStoreRetry("cba")).thenReturn(true);
        when(flyerSyncService.reserveStoreRetry("real")).thenReturn(false);

        assertTrue(service.retryFlyer("cba"));
        assertEquals(false, service.retryFlyer("real"));

        verify(flyerSyncService).runReservedStoreRetry("cba");
        verify(flyerSyncService, never()).runReservedStoreRetry("real");
    }

    @Test
    void unknownStoreRetryIsRejectedBeforeItRuns() {
        when(flyerSyncService.reserveStoreRetry("nope")).thenThrow(new IllegalArgumentException("unknown store"));

        assertThrows(IllegalArgumentException.class, () -> service.retryFlyer("nope"));

        verify(flyerSyncService, never()).runReservedStoreRetry("nope");
    }
}

package com.egyetemkapu.service;

import com.egyetemkapu.model.ReminderChannel;
import com.egyetemkapu.model.ReminderKind;
import com.egyetemkapu.model.ReminderOutbox;
import com.egyetemkapu.model.ReminderStatus;
import com.egyetemkapu.repository.ReminderOutboxRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReminderOutboxServiceTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 9, 1, 8, 0, 5);

    @Mock
    private ReminderOutboxRepository repository;
    @Mock
    private PlatformTransactionManager transactions;
    @Mock
    private TransactionStatus transactionStatus;

    private ReminderOutboxService service;

    @BeforeEach
    void setUp() {
        when(transactions.getTransaction(any())).thenReturn(transactionStatus);
        service = new ReminderOutboxService(repository, transactions);
    }

    @Test
    void enqueueInsertsPendingRow() {
        when(repository.findByIdempotencyKey("k")).thenReturn(Optional.empty());
        when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        assertTrue(service.enqueue(draft("k", "most lejár"), NOW));

        ArgumentCaptor<ReminderOutbox> captor = ArgumentCaptor.forClass(ReminderOutbox.class);
        verify(repository).saveAndFlush(captor.capture());
        ReminderOutbox row = captor.getValue();
        assertEquals(ReminderStatus.PENDING, row.getStatus());
        assertEquals(0, row.getAttempts());
        assertEquals(NOW, row.getAvailableAt());
        assertEquals("most lejár", row.getMessage());
    }

    @Test
    void duplicateKeyIsIgnored() {
        when(repository.findByIdempotencyKey("k")).thenReturn(Optional.empty());
        when(repository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("dup"));

        assertFalse(service.enqueue(draft("k", "most lejár"), NOW));
    }

    @Test
    void sentReminderIsNotQueuedAgain() {
        ReminderOutbox row = existing(ReminderStatus.SENT, 1, "old");
        when(repository.findByIdempotencyKey("k")).thenReturn(Optional.of(row));

        assertFalse(service.enqueue(draft("k", "new"), NOW));

        verify(repository, never()).saveAndFlush(any());
        assertEquals(ReminderStatus.SENT, row.getStatus());
        assertEquals("old", row.getMessage());
    }

    @Test
    void pendingMessageIsRefreshed() {
        ReminderOutbox row = existing(ReminderStatus.PENDING, 0, "old");
        when(repository.findByIdempotencyKey("k")).thenReturn(Optional.of(row));

        assertFalse(service.enqueue(draft("k", "new"), NOW));

        assertEquals("new", row.getMessage());
        assertEquals(ReminderStatus.PENDING, row.getStatus());
    }

    @Test
    void cancelledReminderIsReopened() {
        ReminderOutbox row = existing(ReminderStatus.CANCELLED, 4, "old");
        row.setClaimedAt(NOW.minusMinutes(1));
        row.setSentAt(NOW.minusMinutes(1));
        row.setLastError("task completed");
        when(repository.findByIdempotencyKey("k")).thenReturn(Optional.of(row));

        assertTrue(service.enqueue(draft("k", "new"), NOW));

        assertEquals(ReminderStatus.PENDING, row.getStatus());
        assertEquals(0, row.getAttempts());
        assertEquals(NOW, row.getAvailableAt());
        assertEquals("new", row.getMessage());
        assertNull(row.getClaimedAt());
        assertNull(row.getSentAt());
        assertNull(row.getLastError());
    }

    @Test
    void firstFailureWaitsOneMinute() {
        ReminderOutbox row = sending(1);
        when(repository.findById(4L)).thenReturn(Optional.of(row));

        service.markFailure(4L, DeliveryResult.retry("discord 503"), NOW);

        assertEquals(ReminderStatus.PENDING, row.getStatus());
        assertEquals(NOW.plusMinutes(1), row.getAvailableAt());
        assertEquals("discord 503", row.getLastError());
        assertNull(row.getClaimedAt());
    }

    @Test
    void secondFailureWaitsTwoMinutes() {
        ReminderOutbox row = sending(2);
        when(repository.findById(4L)).thenReturn(Optional.of(row));

        service.markFailure(4L, DeliveryResult.retry("discord 503"), NOW);

        assertEquals(ReminderStatus.PENDING, row.getStatus());
        assertEquals(NOW.plusMinutes(2), row.getAvailableAt());
    }

    @Test
    void fourthFailureWaitsEightMinutes() {
        ReminderOutbox row = sending(4);
        when(repository.findById(4L)).thenReturn(Optional.of(row));

        service.markFailure(4L, DeliveryResult.retry("discord unreachable"), NOW);

        assertEquals(ReminderStatus.PENDING, row.getStatus());
        assertEquals(NOW.plusMinutes(8), row.getAvailableAt());
    }

    @Test
    void fifthFailureIsDead() {
        ReminderOutbox row = sending(5);
        when(repository.findById(4L)).thenReturn(Optional.of(row));

        service.markFailure(4L, DeliveryResult.retry("discord 503"), NOW);

        assertEquals(ReminderStatus.DEAD, row.getStatus());
        assertNull(row.getClaimedAt());
    }

    @Test
    void permanentFailureIsDeadImmediately() {
        ReminderOutbox row = sending(1);
        when(repository.findById(4L)).thenReturn(Optional.of(row));

        service.markFailure(4L, DeliveryResult.permanent("discord 404"), NOW);

        assertEquals(ReminderStatus.DEAD, row.getStatus());
        assertEquals("discord 404", row.getLastError());
    }

    @Test
    void markSentOnlyFromSending() {
        ReminderOutbox row = sending(1);
        when(repository.findById(4L)).thenReturn(Optional.of(row));

        service.markSent(4L, NOW);

        assertEquals(ReminderStatus.SENT, row.getStatus());
        assertEquals(NOW, row.getSentAt());
        assertNull(row.getLastError());
    }

    @Test
    void markSentLeavesAPendingRowAlone() {
        ReminderOutbox row = existing(ReminderStatus.PENDING, 0, "msg");
        when(repository.findById(4L)).thenReturn(Optional.of(row));

        service.markSent(4L, NOW);

        assertEquals(ReminderStatus.PENDING, row.getStatus());
        assertNull(row.getSentAt());
    }

    @Test
    void markCancelledOnlyFromSending() {
        ReminderOutbox row = sending(1);
        when(repository.findById(4L)).thenReturn(Optional.of(row));

        service.markCancelled(4L, "task completed", NOW);

        assertEquals(ReminderStatus.CANCELLED, row.getStatus());
        assertEquals("task completed", row.getLastError());
        assertNull(row.getClaimedAt());
    }

    @Test
    void claimRecoversStaleRowsThenTakesABatch() {
        ReminderOutbox row = sending(1);
        when(repository.claimPending(NOW, ReminderOutboxService.BATCH)).thenReturn(List.of(row));

        List<ClaimedReminder> claimed = service.claim(NOW);

        assertEquals(1, claimed.size());
        assertEquals(4L, claimed.get(0).id());
        assertEquals(ReminderChannel.DISCORD, claimed.get(0).channel());
        verify(repository).recoverStaleClaims(NOW.minusMinutes(2), NOW, ReminderAttempt.MAX_ATTEMPTS);
        verify(repository).claimPending(eq(NOW), eq(ReminderOutboxService.BATCH));
    }

    @Test
    void retryDeadReopensTheSameRow() {
        ReminderOutbox row = existing(ReminderStatus.DEAD, 5, "most lejár");
        row.setLastError("discord 503");
        row.setClaimedAt(NOW);
        when(repository.findById(4L)).thenReturn(Optional.of(row));

        assertEquals(ReminderRetry.REQUEUED, service.retryDead(4L, NOW));

        assertEquals(ReminderStatus.PENDING, row.getStatus());
        assertEquals(0, row.getAttempts());
        assertEquals(NOW, row.getAvailableAt());
        assertNull(row.getLastError());
        assertNull(row.getClaimedAt());
    }

    @Test
    void retryOfASentReminderDoesNotQueueAnother() {
        ReminderOutbox row = existing(ReminderStatus.SENT, 1, "most lejár");
        when(repository.findById(4L)).thenReturn(Optional.of(row));

        assertEquals(ReminderRetry.ALREADY_SENT, service.retryDead(4L, NOW));

        assertEquals(ReminderStatus.SENT, row.getStatus());
        assertEquals(1, row.getAttempts());
    }

    @Test
    void retryOfAPendingReminderDoesNotResetIt() {
        ReminderOutbox row = existing(ReminderStatus.PENDING, 2, "most lejár");
        when(repository.findById(4L)).thenReturn(Optional.of(row));

        assertEquals(ReminderRetry.ALREADY_QUEUED, service.retryDead(4L, NOW));

        assertEquals(2, row.getAttempts());
    }

    @Test
    void retryOfASendingReminderStaysInFlight() {
        ReminderOutbox row = sending(3);
        when(repository.findById(4L)).thenReturn(Optional.of(row));

        assertEquals(ReminderRetry.IN_FLIGHT, service.retryDead(4L, NOW));

        assertEquals(ReminderStatus.SENDING, row.getStatus());
        assertEquals(3, row.getAttempts());
    }

    private static ReminderDraft draft(String key, String message) {
        return new ReminderDraft(
                key,
                7L,
                1L,
                ReminderChannel.DISCORD,
                ReminderKind.AT_DEADLINE,
                0,
                LocalDateTime.of(2026, 9, 1, 8, 0),
                message);
    }

    private static ReminderOutbox existing(ReminderStatus status, int attempts, String message) {
        ReminderOutbox row = new ReminderOutbox();
        row.setId(4L);
        row.setIdempotencyKey("k");
        row.setStatus(status);
        row.setAttempts(attempts);
        row.setMessage(message);
        row.setAvailableAt(NOW);
        return row;
    }

    private static ReminderOutbox sending(int attempts) {
        ReminderOutbox row = existing(ReminderStatus.SENDING, attempts, "most lejár");
        row.setTaskId(7L);
        row.setUserId(1L);
        row.setChannel(ReminderChannel.DISCORD);
        row.setKind(ReminderKind.AT_DEADLINE);
        row.setDeadline(LocalDateTime.of(2026, 9, 1, 8, 0));
        row.setClaimedAt(NOW);
        return row;
    }
}

package com.egyetemkapu.repository;

import com.egyetemkapu.model.ReminderChannel;
import com.egyetemkapu.model.ReminderKind;
import com.egyetemkapu.model.ReminderOutbox;
import com.egyetemkapu.model.ReminderStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.persistence.Tuple;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReminderOutboxRepositoryCustomImplTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 9, 1, 8, 0);

    @Mock private EntityManager entityManager;
    @Mock private Query query;
    @Mock private Tuple tuple;

    private ReminderOutboxRepositoryCustomImpl repository;

    @BeforeEach
    void setUp() {
        repository = new ReminderOutboxRepositoryCustomImpl(entityManager);
    }

    @Test
    void recoverStaleClaimsFlushesThenReturnsTheUpdateCount() {
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);
        when(query.setParameter(anyString(), any())).thenReturn(query);
        when(query.executeUpdate()).thenReturn(2);

        int recovered = repository.recoverStaleClaims(NOW.minusMinutes(2), NOW, 5);

        assertEquals(2, recovered);
        verify(entityManager).flush();
        verify(query).setParameter("maxAttempts", 5);
        verify(query).setParameter("now", NOW);
        verify(query).setParameter("cutoff", NOW.minusMinutes(2));
    }

    @Test
    void claimPendingClampsTheBatchAndMapsEveryColumn() {
        when(entityManager.createNativeQuery(anyString(), eq(Tuple.class))).thenReturn(query);
        when(query.setParameter(anyString(), any())).thenReturn(query);
        when(query.getResultList()).thenReturn(List.of(tuple));
        LocalDateTime deadline = LocalDateTime.of(2026, 9, 1, 10, 0);
        when(tuple.get("id")).thenReturn(4);
        when(tuple.get("idempotency_key")).thenReturn("task:4");
        when(tuple.get("task_id")).thenReturn(9L);
        when(tuple.get("user_id")).thenReturn(3L);
        when(tuple.get("channel")).thenReturn("TELEGRAM");
        when(tuple.get("kind")).thenReturn("HOURS_BEFORE");
        when(tuple.get("hours_before")).thenReturn(2);
        when(tuple.get("deadline")).thenReturn(OffsetDateTime.of(deadline, ZoneOffset.UTC));
        when(tuple.get("message")).thenReturn("hamarosan");
        when(tuple.get("status")).thenReturn("SENDING");
        when(tuple.get("attempts")).thenReturn(1);
        when(tuple.get("available_at")).thenReturn(NOW);
        when(tuple.get("claimed_at")).thenReturn(null);
        when(tuple.get("sent_at")).thenReturn(null);
        when(tuple.get("last_error")).thenReturn(null);
        when(tuple.get("created_at")).thenReturn(NOW.minusDays(1));

        List<ReminderOutbox> claimed = repository.claimPending(NOW, 0);
        repository.claimPending(NOW, 250);

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(entityManager, org.mockito.Mockito.times(2)).createNativeQuery(sql.capture(), eq(Tuple.class));
        assertTrue(sql.getAllValues().get(0).contains("LIMIT 1"));
        assertTrue(sql.getAllValues().get(1).contains("LIMIT 100"));
        assertTrue(sql.getAllValues().get(0).contains("FOR UPDATE SKIP LOCKED"));
        verify(entityManager, org.mockito.Mockito.atLeastOnce()).flush();

        ReminderOutbox row = claimed.getFirst();
        assertEquals(4L, row.getId());
        assertEquals("task:4", row.getIdempotencyKey());
        assertEquals(9L, row.getTaskId());
        assertEquals(3L, row.getUserId());
        assertEquals(ReminderChannel.TELEGRAM, row.getChannel());
        assertEquals(ReminderKind.HOURS_BEFORE, row.getKind());
        assertEquals(2, row.getHoursBefore());
        assertEquals(deadline, row.getDeadline());
        assertEquals("hamarosan", row.getMessage());
        assertEquals(ReminderStatus.SENDING, row.getStatus());
        assertEquals(1, row.getAttempts());
        assertEquals(NOW, row.getAvailableAt());
        assertNull(row.getClaimedAt());
        assertNull(row.getSentAt());
        assertNull(row.getLastError());
        assertEquals(NOW.minusDays(1), row.getCreatedAt());
    }

    @Test
    void unexpectedTimestampTypeIsRejected() {
        when(entityManager.createNativeQuery(anyString(), eq(Tuple.class))).thenReturn(query);
        when(query.setParameter(anyString(), any())).thenReturn(query);
        when(query.getResultList()).thenReturn(List.of(tuple));
        when(tuple.get("id")).thenReturn(1L);
        when(tuple.get("idempotency_key")).thenReturn("k");
        when(tuple.get("task_id")).thenReturn(1L);
        when(tuple.get("user_id")).thenReturn(1L);
        when(tuple.get("channel")).thenReturn("DISCORD");
        when(tuple.get("kind")).thenReturn("AT_DEADLINE");
        when(tuple.get("hours_before")).thenReturn(0);
        when(tuple.get("deadline")).thenReturn("not-a-time");

        IllegalStateException error = assertThrows(
                IllegalStateException.class, () -> repository.claimPending(NOW, 10));
        assertTrue(error.getMessage().contains("Unexpected timestamp type"));
    }
}

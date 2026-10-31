package com.egyetemkapu.repository;

import com.egyetemkapu.model.ReminderChannel;
import com.egyetemkapu.model.ReminderKind;
import com.egyetemkapu.model.ReminderOutbox;
import com.egyetemkapu.model.ReminderStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

class ReminderOutboxRepositoryCustomImpl implements ReminderOutboxRepositoryCustom {

    private final EntityManager entityManager;

    ReminderOutboxRepositoryCustomImpl(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    // --- Stale claims ---
    @Override
    public int recoverStaleClaims(LocalDateTime cutoff, LocalDateTime now, int maxAttempts) {
        entityManager.flush();
        return entityManager.createNativeQuery("""
                        UPDATE reminder_outbox
                        SET status = CASE WHEN attempts >= :maxAttempts THEN 'DEAD' ELSE 'PENDING' END,
                            available_at = CASE WHEN attempts >= :maxAttempts THEN available_at ELSE :now END,
                            claimed_at = NULL,
                            last_error = 'claim expired'
                        WHERE status = 'SENDING'
                          AND claimed_at < :cutoff
                        """)
                .setParameter("maxAttempts", maxAttempts)
                .setParameter("now", now)
                .setParameter("cutoff", cutoff)
                .executeUpdate();
    }

    // --- Claim ---
    @Override
    public List<ReminderOutbox> claimPending(LocalDateTime now, int limit) {
        entityManager.flush();
        int bounded = Math.min(Math.max(limit, 1), 100);
        String sql = """
                UPDATE reminder_outbox AS reminder
                SET status = 'SENDING',
                    attempts = reminder.attempts + 1,
                    claimed_at = :now,
                    last_error = NULL
                FROM (
                    SELECT id
                    FROM reminder_outbox
                    WHERE status = 'PENDING'
                      AND available_at <= :now
                    ORDER BY available_at, id
                    LIMIT %d
                    FOR UPDATE SKIP LOCKED
                ) AS picked
                WHERE reminder.id = picked.id
                RETURNING reminder.id, reminder.idempotency_key, reminder.task_id, reminder.user_id,
                          reminder.channel, reminder.kind, reminder.hours_before, reminder.deadline,
                          reminder.message, reminder.status, reminder.attempts, reminder.available_at,
                          reminder.claimed_at, reminder.sent_at, reminder.last_error, reminder.created_at
                """.formatted(bounded);

        @SuppressWarnings("unchecked")
        List<Tuple> rows = entityManager.createNativeQuery(sql, Tuple.class)
                .setParameter("now", now)
                .getResultList();

        List<ReminderOutbox> claimed = new ArrayList<>();
        for (Tuple row : rows) {
            claimed.add(map(row));
        }
        return claimed;
    }

    private static ReminderOutbox map(Tuple row) {
        ReminderOutbox reminder = new ReminderOutbox();
        reminder.setId(asLong(row.get("id")));
        reminder.setIdempotencyKey(asString(row.get("idempotency_key")));
        reminder.setTaskId(asLong(row.get("task_id")));
        reminder.setUserId(asLong(row.get("user_id")));
        reminder.setChannel(ReminderChannel.valueOf(asString(row.get("channel"))));
        reminder.setKind(ReminderKind.valueOf(asString(row.get("kind"))));
        reminder.setHoursBefore(asInt(row.get("hours_before")));
        reminder.setDeadline(asTime(row.get("deadline")));
        reminder.setMessage(asString(row.get("message")));
        reminder.setStatus(ReminderStatus.valueOf(asString(row.get("status"))));
        reminder.setAttempts(asInt(row.get("attempts")));
        reminder.setAvailableAt(asTime(row.get("available_at")));
        reminder.setClaimedAt(asTime(row.get("claimed_at")));
        reminder.setSentAt(asTime(row.get("sent_at")));
        reminder.setLastError(asString(row.get("last_error")));
        reminder.setCreatedAt(asTime(row.get("created_at")));
        return reminder;
    }

    private static String asString(Object value) {
        return value == null ? null : value.toString();
    }

    private static int asInt(Object value) {
        return ((Number) value).intValue();
    }

    private static long asLong(Object value) {
        return ((Number) value).longValue();
    }

    private static LocalDateTime asTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDateTime time) {
            return time;
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }
        if (value instanceof OffsetDateTime offset) {
            return offset.toLocalDateTime();
        }
        throw new IllegalStateException("Unexpected timestamp type " + value.getClass().getName());
    }
}

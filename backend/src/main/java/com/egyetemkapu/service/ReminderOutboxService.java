package com.egyetemkapu.service;

import com.egyetemkapu.model.ReminderOutbox;
import com.egyetemkapu.model.ReminderStatus;
import com.egyetemkapu.repository.ReminderOutboxRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;

/**
 * At-least-once deadline pings. A row is claimed before the HTTP call, so a crash
 * after Discord or Telegram accepts the message can send it once more. Retries wait
 * with backoff, then the row is dead and is not sent again.
 */
@Service
public class ReminderOutboxService {

    static final int BATCH = 20;

    private static final Logger log = LoggerFactory.getLogger(ReminderOutboxService.class);

    private final ReminderOutboxRepository repository;
    private final TransactionTemplate requiresNew;
    private SiteMeters siteMeters;

    @Autowired(required = false)
    public void setSiteMeters(SiteMeters siteMeters) {
        this.siteMeters = siteMeters;
    }

    public ReminderOutboxService(ReminderOutboxRepository repository, PlatformTransactionManager transactions) {
        this.repository = repository;
        this.requiresNew = new TransactionTemplate(transactions);
        this.requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    // --- Enqueue ---
    public boolean enqueue(ReminderDraft draft, LocalDateTime now) {
        try {
            Boolean queued = requiresNew.execute(status -> insertOrRefresh(draft, now));
            return Boolean.TRUE.equals(queued);
        } catch (DataIntegrityViolationException ex) {
            return false;
        }
    }

    // --- Claim ---
    public List<ClaimedReminder> claim(LocalDateTime now) {
        List<ReminderOutbox> rows = requiresNew.execute(status -> {
            repository.flush();
            repository.recoverStaleClaims(
                    now.minus(ReminderAttempt.STALE_AFTER), now, ReminderAttempt.MAX_ATTEMPTS);
            return repository.claimPending(now, BATCH);
        });
        if (rows == null || rows.isEmpty()) {
            return List.of();
        }
        return rows.stream().map(ClaimedReminder::from).toList();
    }

    // --- Results ---
    public void markSent(long id, LocalDateTime now) {
        requiresNew.executeWithoutResult(status -> {
            ReminderOutbox row = repository.findById(id).orElse(null);
            if (row == null || row.getStatus() != ReminderStatus.SENDING) {
                return;
            }
            row.setStatus(ReminderStatus.SENT);
            row.setSentAt(now);
            row.setLastError(null);
            row.setClaimedAt(null);
            if (siteMeters != null) {
                siteMeters.reminderSent(row, now);
            }
        });
    }

    public void markFailure(long id, DeliveryResult result, LocalDateTime now) {
        requiresNew.executeWithoutResult(status -> {
            ReminderOutbox row = repository.findById(id).orElse(null);
            if (row == null || row.getStatus() != ReminderStatus.SENDING) {
                return;
            }
            boolean permanent = result != null && result.outcome() == DeliveryOutcome.PERMANENT;
            String error = ReminderAttempt.limit(result == null ? null : result.error());
            row.setLastError(error);
            row.setClaimedAt(null);
            if (ReminderAttempt.giveUp(row.getAttempts(), permanent)) {
                row.setStatus(ReminderStatus.DEAD);
                log.warn("Reminder {} is dead after {} attempts ({})", id, row.getAttempts(), error);
                return;
            }
            row.setStatus(ReminderStatus.PENDING);
            row.setAvailableAt(ReminderAttempt.nextAttemptAt(now, row.getAttempts()));
        });
    }

    // --- Retry ---
    public ReminderRetry retryDead(long id, LocalDateTime now) {
        ReminderRetry result = requiresNew.execute(status -> reopenDead(id, now));
        return result == null ? ReminderRetry.NOT_FOUND : result;
    }

    private ReminderRetry reopenDead(long id, LocalDateTime now) {
        ReminderOutbox row = repository.findById(id).orElse(null);
        if (row == null) {
            return ReminderRetry.NOT_FOUND;
        }
        if (row.getStatus() == ReminderStatus.DEAD) {
            row.setStatus(ReminderStatus.PENDING);
            row.setAttempts(0);
            row.setAvailableAt(now);
            row.setClaimedAt(null);
            row.setSentAt(null);
            row.setLastError(null);
            return ReminderRetry.REQUEUED;
        }
        if (row.getStatus() == ReminderStatus.PENDING) {
            return ReminderRetry.ALREADY_QUEUED;
        }
        if (row.getStatus() == ReminderStatus.SENDING) {
            return ReminderRetry.IN_FLIGHT;
        }
        if (row.getStatus() == ReminderStatus.SENT) {
            return ReminderRetry.ALREADY_SENT;
        }
        return ReminderRetry.NOT_DEAD;
    }

    public void markCancelled(long id, String reason, LocalDateTime now) {
        requiresNew.executeWithoutResult(status -> {
            ReminderOutbox row = repository.findById(id).orElse(null);
            if (row == null || row.getStatus() != ReminderStatus.SENDING) {
                return;
            }
            row.setStatus(ReminderStatus.CANCELLED);
            row.setLastError(ReminderAttempt.limit(reason));
            row.setClaimedAt(null);
            row.setAvailableAt(now);
        });
    }

    private boolean insertOrRefresh(ReminderDraft draft, LocalDateTime now) {
        ReminderOutbox existing = repository.findByIdempotencyKey(draft.idempotencyKey()).orElse(null);
        if (existing != null) {
            if (existing.getStatus() == ReminderStatus.PENDING) {
                existing.setMessage(draft.message());
                return false;
            }
            if (existing.getStatus() == ReminderStatus.CANCELLED) {
                reopen(existing, draft, now);
                return true;
            }
            return false;
        }
        repository.saveAndFlush(newRow(draft, now));
        return true;
    }

    private static void reopen(ReminderOutbox row, ReminderDraft draft, LocalDateTime now) {
        row.setStatus(ReminderStatus.PENDING);
        row.setAttempts(0);
        row.setAvailableAt(now);
        row.setClaimedAt(null);
        row.setSentAt(null);
        row.setLastError(null);
        row.setMessage(draft.message());
        row.setDeadline(draft.deadline());
        row.setHoursBefore(draft.hoursBefore());
    }

    private static ReminderOutbox newRow(ReminderDraft draft, LocalDateTime now) {
        ReminderOutbox row = new ReminderOutbox();
        row.setIdempotencyKey(draft.idempotencyKey());
        row.setTaskId(draft.taskId());
        row.setUserId(draft.userId());
        row.setChannel(draft.channel());
        row.setKind(draft.kind());
        row.setHoursBefore(draft.hoursBefore());
        row.setDeadline(draft.deadline());
        row.setMessage(draft.message());
        row.setStatus(ReminderStatus.PENDING);
        row.setAttempts(0);
        row.setAvailableAt(now);
        row.setCreatedAt(now);
        return row;
    }
}

package com.egyetemkapu.repository;

import com.egyetemkapu.model.ReminderOutbox;

import java.time.LocalDateTime;
import java.util.List;

public interface ReminderOutboxRepositoryCustom {

    int recoverStaleClaims(LocalDateTime cutoff, LocalDateTime now, int maxAttempts);

    List<ReminderOutbox> claimPending(LocalDateTime now, int limit);
}

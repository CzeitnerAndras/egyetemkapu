package com.egyetemkapu.repository;

import com.egyetemkapu.model.ReminderOutbox;
import com.egyetemkapu.model.ReminderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReminderOutboxRepository extends JpaRepository<ReminderOutbox, Long>, ReminderOutboxRepositoryCustom {

    Optional<ReminderOutbox> findByIdempotencyKey(String idempotencyKey);

    List<ReminderOutbox> findTop50ByStatusOrderByIdDesc(ReminderStatus status);
}

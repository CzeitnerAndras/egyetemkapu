package com.egyetemkapu.repository;

import com.egyetemkapu.model.FlyerSyncRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface FlyerSyncRunRepository extends JpaRepository<FlyerSyncRun, Long> {

    // --- History ---
    List<FlyerSyncRun> findAllByOrderByStartedAtDesc();

    void deleteByStartedAtBefore(LocalDateTime cutoff);
}

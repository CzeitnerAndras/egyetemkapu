package com.egyetemkapu.repository;

import com.egyetemkapu.model.PromptLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PromptLogRepository extends JpaRepository<PromptLog, Long> {
}
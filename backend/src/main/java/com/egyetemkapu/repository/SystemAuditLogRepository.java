package com.egyetemkapu.repository;

import com.egyetemkapu.model.SystemAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SystemAuditLogRepository extends JpaRepository<SystemAuditLog, Long> {
    long countByAction(String action);
}
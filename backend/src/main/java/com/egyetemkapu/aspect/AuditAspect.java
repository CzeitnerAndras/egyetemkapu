package com.egyetemkapu.aspect;

import com.egyetemkapu.annotation.LogAction;
import com.egyetemkapu.model.SystemAuditLog;
import com.egyetemkapu.repository.SystemAuditLogRepository;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class AuditAspect {

    private final SystemAuditLogRepository auditLogRepository;

    public AuditAspect(SystemAuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @AfterReturning("@annotation(logAction)")
    public void logMethodCall(JoinPoint joinPoint, LogAction logAction) {
        String username = "ismeretlen";
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && !authentication.getName().equals("anonymousUser")) {
            username = authentication.getName();
        }

        String methodName = joinPoint.getSignature().getName();
        String actionName = logAction.value();

        SystemAuditLog log = new SystemAuditLog();
        log.setUsername(username);
        log.setAction(actionName);
        log.setDetails("Meghívott metódus: " + methodName);
        
        auditLogRepository.save(log);
        System.out.println("AUDIT LOG -> Felhasználó: " + username + " | Akció: " + actionName);
    }
}
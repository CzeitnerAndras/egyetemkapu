package com.egyetemkapu.aspect;

import com.egyetemkapu.annotation.LogAction;
import com.egyetemkapu.model.SystemAuditLog;
import com.egyetemkapu.repository.SystemAuditLogRepository;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.Signature;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuditAspectTest {

    private final SystemAuditLogRepository auditLogRepository = mock(SystemAuditLogRepository.class);
    private final AuditAspect aspect = new AuditAspect(auditLogRepository);

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void logMethodCall_storesTheSignedInUsername() {
        authenticate("anna");

        aspect.logMethodCall(joinPoint("createNote"), action("Új jegyzet létrehozása"));

        SystemAuditLog saved = savedLog();
        assertEquals("anna", saved.getUsername());
        assertEquals("Új jegyzet létrehozása", saved.getAction());
        assertEquals("Meghívott metódus: createNote", saved.getDetails());
    }

    @Test
    void logMethodCall_usesIsmeretlenWhenNobodyIsSignedIn() {
        aspect.logMethodCall(joinPoint("createEvent"), action("Új Hírek/Esemény létrehozása"));

        assertEquals("ismeretlen", savedLog().getUsername());
    }

    @Test
    void logMethodCall_treatsTheAnonymousUserAsUnknown() {
        authenticate("anonymousUser");

        aspect.logMethodCall(joinPoint("deleteSuggestion"), action("Ötlet/javaslat törlése"));

        assertEquals("ismeretlen", savedLog().getUsername());
    }

    private SystemAuditLog savedLog() {
        org.mockito.ArgumentCaptor<SystemAuditLog> captor =
                org.mockito.ArgumentCaptor.forClass(SystemAuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        return captor.getValue();
    }

    private static JoinPoint joinPoint(String methodName) {
        Signature signature = mock(Signature.class);
        when(signature.getName()).thenReturn(methodName);
        JoinPoint joinPoint = mock(JoinPoint.class);
        when(joinPoint.getSignature()).thenReturn(signature);
        return joinPoint;
    }

    private static LogAction action(String value) {
        LogAction logAction = mock(LogAction.class);
        when(logAction.value()).thenReturn(value);
        return logAction;
    }

    private static void authenticate(String username) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(username, null, List.of()));
    }
}

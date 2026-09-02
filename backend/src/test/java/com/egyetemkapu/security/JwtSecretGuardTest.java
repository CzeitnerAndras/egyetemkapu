package com.egyetemkapu.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtSecretGuardTest {

    @Test
    void rejectsBlankSecret() {
        assertThrows(IllegalStateException.class, () -> new JwtSecretGuard(""));
        assertThrows(IllegalStateException.class, () -> new JwtSecretGuard("   "));
        assertThrows(IllegalStateException.class, () -> new JwtSecretGuard(null));
    }

    @Test
    void acceptsConfiguredSecret() {
        assertDoesNotThrow(() -> new JwtSecretGuard("production-secret-at-least-32-characters"));
    }
}

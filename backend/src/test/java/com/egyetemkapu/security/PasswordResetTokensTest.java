package com.egyetemkapu.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PasswordResetTokensTest {

    @Test
    void hash_IsStableAndDoesNotEchoRawToken() {
        String raw = "abc123";
        String hash = PasswordResetTokens.hash(raw);

        assertEquals(64, hash.length());
        assertEquals(hash, PasswordResetTokens.hash(raw));
        assertFalse(hash.contains(raw));
    }

    @Test
    void newRawToken_IsUnique() {
        String first = PasswordResetTokens.newRawToken();
        String second = PasswordResetTokens.newRawToken();

        assertTrue(first.length() >= 32);
        assertNotEquals(first, second);
    }

    @Test
    void hash_BlankToken_ReturnsEmpty() {
        assertEquals("", PasswordResetTokens.hash(" "));
        assertEquals("", PasswordResetTokens.hash(null));
    }
}

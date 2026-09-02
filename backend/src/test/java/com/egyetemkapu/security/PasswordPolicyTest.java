package com.egyetemkapu.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PasswordPolicyTest {

    @Test
    void acceptsFrontendCompatiblePasswords() {
        assertTrue(PasswordPolicy.isValid("Password1!"));
        assertTrue(PasswordPolicy.isValid("Titkos123!"));
        assertTrue(PasswordPolicy.isValid("Abcdefg1?"));
    }

    @Test
    void rejectsWeakPasswords() {
        assertFalse(PasswordPolicy.isValid(null));
        assertFalse(PasswordPolicy.isValid(""));
        assertFalse(PasswordPolicy.isValid("gyengejelszo"));
        assertFalse(PasswordPolicy.isValid("Password1"));
        assertFalse(PasswordPolicy.isValid("password1!"));
        assertFalse(PasswordPolicy.isValid("Password!"));
        assertFalse(PasswordPolicy.isValid("Pw1!"));
    }
}

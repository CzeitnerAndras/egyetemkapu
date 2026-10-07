package com.egyetemkapu.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UsernamePolicyTest {

    @Test
    void acceptsRegistrationNames() {
        assertTrue(UsernamePolicy.isValid("anna"));
        assertTrue(UsernamePolicy.isValid("diak.nev"));
        assertTrue(UsernamePolicy.isValid("a_b-c"));
        assertTrue(UsernamePolicy.isValid("abc"));
        assertTrue(UsernamePolicy.isValid("a".repeat(32)));
    }

    @Test
    void rejectsNamesOutsideTheRegistrationRules() {
        assertFalse(UsernamePolicy.isValid(null));
        assertFalse(UsernamePolicy.isValid(""));
        assertFalse(UsernamePolicy.isValid("ab"));
        assertFalse(UsernamePolicy.isValid("a".repeat(33)));
        assertFalse(UsernamePolicy.isValid("rossz nev"));
        assertFalse(UsernamePolicy.isValid("név"));
        assertFalse(UsernamePolicy.isValid("anna@iskola"));
    }
}

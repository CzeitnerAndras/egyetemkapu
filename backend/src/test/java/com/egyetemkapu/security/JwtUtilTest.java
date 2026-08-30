package com.egyetemkapu.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil("test-secret-key-at-least-32-characters!!");
    }

    @Test
    void generateToken_ValidUsername_ReturnsValidToken() {
        String username = "teszt_hallgato";
        String token = jwtUtil.generateToken(username);

        assertNotNull(token, "A generált token nem lehet null");
        assertTrue(token.length() > 20, "A tokennak megfelelő hosszúságúnak kell lennie");
    }

    @Test
    void validateToken_ValidToken_ReturnsTrueAndCorrectUsername() {
        String username = "teszt_hallgato";
        String token = jwtUtil.generateToken(username);

        assertTrue(jwtUtil.validateToken(token), "A valid tokent el kell fogadnia a rendszernek");
        assertEquals(username, jwtUtil.extractUsername(token), "A kinyert névnek egyeznie kell");
    }

    @Test
    void validateToken_InvalidToken_ReturnsFalse() {
        String invalidToken = "ez.egy.nagyon.rossz.token";
        assertFalse(jwtUtil.validateToken(invalidToken), "A hamis tokent el kell utasítania");
    }

    @Test
    void validateToken_DifferentSecrets_RejectsForeignToken() {
        JwtUtil other = new JwtUtil("another-secret-key-also-32-characters!");
        String token = other.generateToken("teszt_hallgato");
        assertFalse(jwtUtil.validateToken(token));
    }
}

package com.egyetemkapu.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
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
}
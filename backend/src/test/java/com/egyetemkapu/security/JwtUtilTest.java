package com.egyetemkapu.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Date;

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

    @Test
    void sessionVersion_RoundTripsAndTreatsAMissingClaimAsZero() {
        String current = jwtUtil.generateToken("teszt_hallgato", 4);
        String legacy = Jwts.builder()
                .setSubject("teszt_hallgato")
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor("test-secret-key-at-least-32-characters!!".getBytes(StandardCharsets.UTF_8)))
                .compact();

        assertEquals(4, jwtUtil.sessionVersion(current));
        assertEquals(0, jwtUtil.sessionVersion(legacy));
        assertEquals(0, jwtUtil.sessionVersion(jwtUtil.generateToken("teszt_hallgato")));
    }

    @Test
    void sessionVersion_InvalidTokenAndNonNumericClaim_ReturnZero() {
        String textClaim = Jwts.builder()
                .setSubject("teszt_hallgato")
                .claim("sv", "negy")
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor("test-secret-key-at-least-32-characters!!".getBytes(StandardCharsets.UTF_8)))
                .compact();

        assertEquals(0, jwtUtil.sessionVersion("nem-token"));
        assertEquals(0, jwtUtil.sessionVersion(textClaim));
    }
}

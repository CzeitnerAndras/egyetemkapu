package com.egyetemkapu.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;

@Component
public class JwtUtil {

    private final Key key;
    private final long EXPIRATION_TIME = 1000 * 60 * 15;

    public JwtUtil(@Value("${JWT_SECRET:}") String secret) {
        this.key = resolveKey(secret);
    }

    private static Key resolveKey(String secret) {
        if (secret == null || secret.isBlank()) {
            return Keys.secretKeyFor(SignatureAlgorithm.HS256);
        }
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            try {
                keyBytes = MessageDigest.getInstance("SHA-256").digest(keyBytes);
            } catch (NoSuchAlgorithmException e) {
                throw new IllegalStateException("SHA-256 nem elérhető a JWT kulcs származtatásához", e);
            }
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }

    // --- Tokens ---
    public String generateToken(String username) {
        return generateToken(username, 0);
    }

    public String generateToken(String username, int sessionVersion) {
        return Jwts.builder()
                .setSubject(username)
                .claim("sv", sessionVersion)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(key)
                .compact();
    }

    public String extractUsername(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    public int sessionVersion(String token) {
        try {
            Object value = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token)
                    .getBody()
                    .get("sv");
            if (value instanceof Number number) {
                return number.intValue();
            }
            return 0;
        } catch (Exception e) {
            return 0;
        }
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}

package com.egyetemkapu.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

@Component
@Profile("prod")
public class JwtSecretGuard {

    static final int MIN_SECRET_BYTES = 32;

    public JwtSecretGuard(@Value("${JWT_SECRET:}") String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "JWT_SECRET hiányzik. Production indításhoz add meg a JWT_SECRET környezeti változót.");
        }
        if (secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "JWT_SECRET túl rövid. Production indításhoz legalább 32 bájtos titok kell.");
        }
    }
}

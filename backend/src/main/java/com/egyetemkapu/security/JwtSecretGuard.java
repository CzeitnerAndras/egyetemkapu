package com.egyetemkapu.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
public class JwtSecretGuard {

    public JwtSecretGuard(@Value("${JWT_SECRET:}") String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "JWT_SECRET hiányzik. Production indításhoz add meg a JWT_SECRET környezeti változót.");
        }
    }
}

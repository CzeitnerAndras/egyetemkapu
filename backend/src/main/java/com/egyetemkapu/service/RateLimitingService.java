package com.egyetemkapu.service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimitingService {

    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();

    public Bucket resolveBucket(String username) {
        return cache.computeIfAbsent(username, this::newBucket);
    }

    public Bucket resolveForgotPasswordBucket(String clientKey) {
        return cache.computeIfAbsent("forgot:" + clientKey, key -> newFixedBucket(5, Duration.ofMinutes(15)));
    }

    public Bucket resolvePasswordResetBucket(String clientKey) {
        return cache.computeIfAbsent("reset:" + clientKey, key -> newFixedBucket(10, Duration.ofMinutes(15)));
    }

    public Bucket resolveLoginBucket(String clientKey) {
        return cache.computeIfAbsent("login:" + clientKey, key -> newFixedBucket(10, Duration.ofMinutes(15)));
    }

    public Bucket resolveRegisterBucket(String clientKey) {
        return cache.computeIfAbsent("register:" + clientKey, key -> newFixedBucket(5, Duration.ofMinutes(15)));
    }

    public Bucket resolveVerifyEmailBucket(String clientKey) {
        return cache.computeIfAbsent("verify:" + clientKey, key -> newFixedBucket(10, Duration.ofMinutes(15)));
    }

    private Bucket newBucket(String username) {
        return newFixedBucket(5, Duration.ofMinutes(1));
    }

    private Bucket newFixedBucket(int capacity, Duration period) {
        Refill refill = Refill.intervally(capacity, period);
        Bandwidth limit = Bandwidth.classic(capacity, refill);
        return Bucket.builder()
                .addLimit(limit)
                .build();
    }
}
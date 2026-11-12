package com.egyetemkapu.service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class RateLimitingService {

    static final int MAX_BUCKETS = 5_000;
    private static final Duration IDLE_TTL = Duration.ofMinutes(15);

    private final Map<String, Slot> cache = new ConcurrentHashMap<>();

    int bucketCount() {
        return cache.size();
    }

    // --- Buckets ---
    public Bucket resolveBucket(String username) {
        return resolve(username, 5, Duration.ofMinutes(1));
    }

    public Bucket resolveForgotPasswordBucket(String clientKey) {
        return resolve("forgot:" + clientKey, 5, Duration.ofMinutes(15));
    }

    public Bucket resolvePasswordResetBucket(String clientKey) {
        return resolve("reset:" + clientKey, 10, Duration.ofMinutes(15));
    }

    public Bucket resolveLoginBucket(String clientKey) {
        return resolve("login:" + clientKey, 10, Duration.ofMinutes(15));
    }

    public Bucket resolveRegisterBucket(String clientKey) {
        return resolve("register:" + clientKey, 5, Duration.ofMinutes(15));
    }

    public Bucket resolveVerifyEmailBucket(String clientKey) {
        return resolve("verify:" + clientKey, 10, Duration.ofMinutes(15));
    }

    public Bucket resolveFlyerPageBucket(String clientKey) {
        return resolve("flyer-page:" + clientKey, 30, Duration.ofMinutes(1));
    }

    public Bucket resolveSuggestionBucket(String clientKey) {
        return resolve("suggestion:" + clientKey, 8, Duration.ofMinutes(15));
    }

    private Bucket resolve(String key, int capacity, Duration period) {
        long now = System.nanoTime();
        Slot slot = cache.compute(key, (ignored, existing) -> {
            if (existing != null) {
                existing.seenAt.set(now);
                return existing;
            }
            return new Slot(newFixedBucket(capacity, period), new AtomicLong(now));
        });
        if (cache.size() > MAX_BUCKETS) {
            prune(now);
        }
        return slot.bucket;
    }

    private void prune(long now) {
        long idle = IDLE_TTL.toNanos();
        cache.entrySet().removeIf(entry -> now - entry.getValue().seenAt.get() > idle);
        if (cache.size() <= MAX_BUCKETS) {
            return;
        }
        List<Map.Entry<String, Slot>> oldest = new ArrayList<>(cache.entrySet());
        oldest.sort(Comparator.comparingLong(entry -> entry.getValue().seenAt.get()));
        int extra = cache.size() - MAX_BUCKETS;
        for (int i = 0; i < extra && i < oldest.size(); i++) {
            Map.Entry<String, Slot> entry = oldest.get(i);
            cache.remove(entry.getKey(), entry.getValue());
        }
    }

    private record Slot(Bucket bucket, AtomicLong seenAt) {
    }

    private Bucket newFixedBucket(int capacity, Duration period) {
        Refill refill = Refill.intervally(capacity, period);
        Bandwidth limit = Bandwidth.classic(capacity, refill);
        return Bucket.builder()
                .addLimit(limit)
                .build();
    }
}
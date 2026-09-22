package com.egyetemkapu.service;

import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ActiveUserService {

    static final Duration ACTIVE_WINDOW = Duration.ofMinutes(5);
    static final int MAX_VISITORS = 20_000;

    private final ConcurrentHashMap<String, Instant> lastSeen = new ConcurrentHashMap<>();
    private final Clock clock;

    public ActiveUserService(Clock clock) {
        this.clock = clock;
    }

    public void heartbeat(String visitorId) {
        if (!isValidVisitorId(visitorId)) return;

        pruneExpired();
        if (lastSeen.size() >= MAX_VISITORS && !lastSeen.containsKey(visitorId)) {
            return;
        }
        lastSeen.put(visitorId, Instant.now(clock));
    }

    public int countActive() {
        pruneExpired();
        return lastSeen.size();
    }

    static boolean isValidVisitorId(String visitorId) {
        if (visitorId == null || visitorId.isBlank()) return false;
        try {
            UUID.fromString(visitorId.trim());
            return true;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private void pruneExpired() {
        Instant cutoff = Instant.now(clock).minus(ACTIVE_WINDOW);
        for (Map.Entry<String, Instant> entry : lastSeen.entrySet()) {
            if (entry.getValue().isBefore(cutoff)) {
                lastSeen.remove(entry.getKey(), entry.getValue());
            }
        }
    }
}

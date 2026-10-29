package com.egyetemkapu.controller;

import com.egyetemkapu.dto.DeadLetterQueueDto;
import com.egyetemkapu.service.DeadLetterService;
import com.egyetemkapu.service.ReminderRetry;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/dead-letters")
public class DeadLetterController {

    private final DeadLetterService deadLetterService;

    public DeadLetterController(DeadLetterService deadLetterService) {
        this.deadLetterService = deadLetterService;
    }

    // --- Queue ---
    @GetMapping
    public DeadLetterQueueDto list() {
        return deadLetterService.list();
    }

    @PostMapping("/reminders/{id}/retry")
    public ResponseEntity<Map<String, String>> retryReminder(@PathVariable long id) {
        ReminderRetry result = deadLetterService.retryReminder(id);
        if (result == ReminderRetry.NOT_FOUND) {
            return ResponseEntity.notFound().build();
        }
        if (result == ReminderRetry.REQUEUED || result == ReminderRetry.ALREADY_QUEUED) {
            return ResponseEntity.ok(Map.of("result", result.name()));
        }
        return ResponseEntity.status(409).body(Map.of("result", result.name()));
    }

    @PostMapping("/flyers/{store}/retry")
    public ResponseEntity<Map<String, String>> retryFlyer(@PathVariable String store) {
        try {
            if (!deadLetterService.retryFlyer(store)) {
                return ResponseEntity.status(409).body(Map.of("result", "BUSY"));
            }
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("result", "UNKNOWN"));
        }
        return ResponseEntity.accepted().body(Map.of("result", "STARTED"));
    }
}

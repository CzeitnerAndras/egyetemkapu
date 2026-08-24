package com.egyetemkapu.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "tasks")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(name = "task_type", nullable = false)
    private String taskType;

    @Column(nullable = false)
    private LocalDateTime deadline;

    @Column(nullable = false)
    private boolean completed = false;

    @Column(name = "ping_day_before")
    private boolean pingDayBefore;

    @Column(name = "ping_on_day")
    private boolean pingOnDay;

    @Column(name = "ping_telegram_day_before")
    private boolean pingTelegramDayBefore = false;

    @Column(name = "ping_telegram_on_day")
    private boolean pingTelegramOnDay = false;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
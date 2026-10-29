package com.egyetemkapu.service;

public enum ReminderRetry {
    REQUEUED,
    ALREADY_QUEUED,
    ALREADY_SENT,
    IN_FLIGHT,
    NOT_DEAD,
    NOT_FOUND
}

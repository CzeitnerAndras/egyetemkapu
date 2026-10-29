package com.egyetemkapu.service;

public record DeliveryResult(DeliveryOutcome outcome, String error) {

    public static DeliveryResult sent() {
        return new DeliveryResult(DeliveryOutcome.SENT, null);
    }

    public static DeliveryResult retry(String error) {
        return new DeliveryResult(DeliveryOutcome.RETRY, error);
    }

    public static DeliveryResult permanent(String error) {
        return new DeliveryResult(DeliveryOutcome.PERMANENT, error);
    }
}

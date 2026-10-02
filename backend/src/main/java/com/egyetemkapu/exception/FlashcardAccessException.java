package com.egyetemkapu.exception;

public class FlashcardAccessException extends RuntimeException {

    public FlashcardAccessException() {
        super("A kártya vagy a pakli nem található.");
    }
}

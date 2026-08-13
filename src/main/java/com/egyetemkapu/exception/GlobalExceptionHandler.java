package com.egyetemkapu.exception;

import io.swagger.v3.oas.annotations.Hidden;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Hidden
@ControllerAdvice(basePackages = "com.egyetemkapu.controller")
public class GlobalExceptionHandler {

    //Általános paraméterek elkapása
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleAllExceptions(Exception ex) {
        return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Rendszerhiba történt", ex.getMessage());
    }

    //Szabálytalan paraméterek elkapása
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Érvénytelen kérés", ex.getMessage());
    }

    private ResponseEntity<Map<String, Object>> buildErrorResponse(HttpStatus status, String error, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", status.value());
        body.put("error", error);
        body.put("message", message);

        return new ResponseEntity<>(body, status);
    }
}
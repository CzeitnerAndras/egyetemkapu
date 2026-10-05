package com.egyetemkapu.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void unexpectedErrorsHideTheCause() {
        ResponseEntity<Map<String, Object>> response = handler.handleAllExceptions(
                new RuntimeException("jdbc:postgresql://db/egyetemkapu password=secret"));

        assertEquals(500, response.getStatusCode().value());
        String body = String.valueOf(response.getBody());
        assertFalse(body.contains("secret"));
        assertFalse(body.contains("jdbc"));
        assertEquals("Rendszerhiba történt", response.getBody().get("error"));
        assertEquals("Próbáld újra később.", response.getBody().get("message"));
    }

    @Test
    void validationErrorsStillExplainTheRequest() {
        ResponseEntity<Map<String, Object>> response = handler.handleIllegalArgument(
                new IllegalArgumentException("Ez a forrás nem engedélyezett."));

        assertEquals(400, response.getStatusCode().value());
        assertEquals("Ez a forrás nem engedélyezett.", response.getBody().get("message"));
    }

    @Test
    void missingFlashcardIsNotFound() {
        ResponseEntity<Map<String, Object>> response = handler.handleMissingFlashcard(new FlashcardAccessException());

        assertEquals(404, response.getStatusCode().value());
        assertEquals("Nem található", response.getBody().get("error"));
        assertEquals("A kártya vagy a pakli nem található.", response.getBody().get("message"));
    }
}

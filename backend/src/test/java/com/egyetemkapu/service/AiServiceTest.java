package com.egyetemkapu.service;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AiServiceTest {

    @Test
    void askAi_RejectsPromptsOverLimitWithoutCallingProvider() {
        AiService service = new AiService();
        ReflectionTestUtils.setField(service, "aiApiKey", "teszt-kulcs");

        String answer = service.askAi("x".repeat(AiService.MAX_PROMPT_CHARS + 1));

        assertEquals("A kérdés maximum " + AiService.MAX_PROMPT_CHARS + " karakter lehet.", answer);
    }

    @Test
    void askAi_RejectsBlankPrompt() {
        AiService service = new AiService();
        ReflectionTestUtils.setField(service, "aiApiKey", "teszt-kulcs");

        assertEquals("Üres kérdés.", service.askAi("   "));
    }
}

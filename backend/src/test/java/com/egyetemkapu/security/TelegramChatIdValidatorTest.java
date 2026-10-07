package com.egyetemkapu.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TelegramChatIdValidatorTest {

    @Test
    void acceptsNumericChatIdsAndBlankValues() {
        assertTrue(TelegramChatIdValidator.isAllowed("12345"));
        assertTrue(TelegramChatIdValidator.isAllowed(" -1001234567890 "));
        assertTrue(TelegramChatIdValidator.isBlankOrAllowed(null));
        assertTrue(TelegramChatIdValidator.isBlankOrAllowed("  "));
        assertEquals("12345", TelegramChatIdValidator.normalize(" 12345 "));
        assertNull(TelegramChatIdValidator.normalize(""));
    }

    @Test
    void rejectsNamesUrlsAndExtraText() {
        assertFalse(TelegramChatIdValidator.isAllowed("@diak"));
        assertFalse(TelegramChatIdValidator.isAllowed("https://api.telegram.org/botTOKEN/sendMessage"));
        assertFalse(TelegramChatIdValidator.isAllowed("12345\n678"));
        assertFalse(TelegramChatIdValidator.isAllowed("123 456"));
        assertFalse(TelegramChatIdValidator.isBlankOrAllowed("not-an-id"));
        assertNull(TelegramChatIdValidator.normalize("not-an-id"));
    }
}

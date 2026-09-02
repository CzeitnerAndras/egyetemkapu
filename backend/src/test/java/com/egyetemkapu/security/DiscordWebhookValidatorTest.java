package com.egyetemkapu.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DiscordWebhookValidatorTest {

    private static final String VALID =
            "https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyzABCDEF123456";

    @Test
    void acceptsOfficialDiscordWebhook() {
        assertTrue(DiscordWebhookValidator.isAllowed(VALID));
        assertTrue(DiscordWebhookValidator.isAllowed(
                "https://discordapp.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyzABCDEF123456"));
        assertTrue(DiscordWebhookValidator.isBlankOrAllowed(""));
        assertTrue(DiscordWebhookValidator.isBlankOrAllowed(null));
    }

    @Test
    void rejectsNonHttpsAndPrivateTargets() {
        assertFalse(DiscordWebhookValidator.isAllowed("http://discord.com/api/webhooks/1/token"));
        assertFalse(DiscordWebhookValidator.isAllowed("https://169.254.169.254/latest/meta-data/"));
        assertFalse(DiscordWebhookValidator.isAllowed("http://backend:8080/api/users/me"));
        assertFalse(DiscordWebhookValidator.isAllowed("https://evil.example/api/webhooks/1/token"));
        assertFalse(DiscordWebhookValidator.isAllowed("https://discord.com.evil.example/api/webhooks/1/token"));
        assertFalse(DiscordWebhookValidator.isAllowed("https://user:pass@discord.com/api/webhooks/1/token"));
        assertFalse(DiscordWebhookValidator.isAllowed("https://discord.com/api/v10/users/@me"));
        assertFalse(DiscordWebhookValidator.isAllowed("https://discord.com/api/webhooks/not-a-snowflake/token"));
        assertFalse(DiscordWebhookValidator.isAllowed("not a url"));
    }
}

package com.egyetemkapu.security;

import java.net.URI;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

public final class DiscordWebhookValidator {

    private static final Set<String> ALLOWED_HOSTS = Set.of("discord.com", "discordapp.com");
    private static final Pattern WEBHOOK_PATH = Pattern.compile("^/api/webhooks/[0-9]+/[A-Za-z0-9_-]+/?$");

    private DiscordWebhookValidator() {
    }

    public static boolean isBlankOrAllowed(String webhookUrl) {
        return webhookUrl == null || webhookUrl.isBlank() || isAllowed(webhookUrl);
    }

    public static boolean isAllowed(String webhookUrl) {
        if (webhookUrl == null || webhookUrl.isBlank()) {
            return false;
        }

        try {
            URI uri = URI.create(webhookUrl.trim());
            if (!"https".equalsIgnoreCase(uri.getScheme())) {
                return false;
            }
            if (uri.getUserInfo() != null) {
                return false;
            }

            String host = uri.getHost();
            if (host == null) {
                return false;
            }
            if (!ALLOWED_HOSTS.contains(host.toLowerCase(Locale.ROOT))) {
                return false;
            }

            String path = uri.getPath();
            return path != null && WEBHOOK_PATH.matcher(path).matches();
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }
}

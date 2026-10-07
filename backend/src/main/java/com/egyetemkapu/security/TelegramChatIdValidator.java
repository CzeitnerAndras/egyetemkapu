package com.egyetemkapu.security;

import java.util.regex.Pattern;

public final class TelegramChatIdValidator {

    private static final Pattern CHAT_ID = Pattern.compile("-?\\d{1,19}");

    private TelegramChatIdValidator() {
    }

    public static boolean isBlankOrAllowed(String chatId) {
        return chatId == null || chatId.isBlank() || isAllowed(chatId);
    }

    public static boolean isAllowed(String chatId) {
        return chatId != null && CHAT_ID.matcher(chatId.trim()).matches();
    }

    public static String normalize(String chatId) {
        if (!isAllowed(chatId)) {
            return null;
        }
        return chatId.trim();
    }
}

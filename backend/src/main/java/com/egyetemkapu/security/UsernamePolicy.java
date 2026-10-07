package com.egyetemkapu.security;

import java.util.regex.Pattern;

public final class UsernamePolicy {

    public static final String UNAVAILABLE_MESSAGE = "A felhasználónév nem módosítható.";

    private static final Pattern PATTERN = Pattern.compile("^[a-zA-Z0-9._-]{3,32}$");

    private UsernamePolicy() {
    }

    public static boolean isValid(String username) {
        return username != null && PATTERN.matcher(username).matches();
    }
}

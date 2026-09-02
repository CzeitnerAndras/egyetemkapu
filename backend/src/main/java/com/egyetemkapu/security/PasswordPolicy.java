package com.egyetemkapu.security;

import java.util.regex.Pattern;

public final class PasswordPolicy {

    public static final String WEAK_PASSWORD_MESSAGE =
            "A jelszónak legalább 8 karakternek kell lennie, tartalmaznia kell egy nagybetűt, egy számot és egy szimbólumot (pl. ? - +)!";

    private static final Pattern PATTERN = Pattern.compile("^(?=.*[A-Z])(?=.*\\d)(?=.*[?,\\-+!@#$%^&*]).{8,}$");

    private PasswordPolicy() {
    }

    public static boolean isValid(String password) {
        return password != null && PATTERN.matcher(password).matches();
    }
}

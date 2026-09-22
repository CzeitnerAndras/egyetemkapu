package com.egyetemkapu.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;

import java.time.Duration;

public final class AuthCookies {

    public static final String ACCESS = "ek_access";
    public static final String REFRESH = "ek_refresh";
    public static final Duration ACCESS_TTL = Duration.ofMinutes(15);
    public static final Duration REFRESH_TTL = Duration.ofDays(7);

    private AuthCookies() {
    }

    public static void setAccess(HttpServletResponse response, String jwt, boolean secure) {
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie(jwt, ACCESS_TTL, secure).toString());
    }

    public static void setRefresh(HttpServletResponse response, String rawToken, boolean secure) {
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie(rawToken, REFRESH_TTL, secure).toString());
    }

    public static void clearSession(HttpServletResponse response, boolean secure) {
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie("", Duration.ZERO, secure).toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie("", Duration.ZERO, secure).toString());
    }

    public static void clearRefresh(HttpServletResponse response, boolean secure) {
        clearSession(response, secure);
    }

    public static String readAccess(HttpServletRequest request) {
        return read(request, ACCESS);
    }

    public static String readRefresh(HttpServletRequest request) {
        return read(request, REFRESH);
    }

    public static boolean hasAuthCookie(HttpServletRequest request) {
        String access = readAccess(request);
        String refresh = readRefresh(request);
        return (access != null && !access.isBlank()) || (refresh != null && !refresh.isBlank());
    }

    private static String read(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private static ResponseCookie accessCookie(String value, Duration maxAge, boolean secure) {
        return ResponseCookie.from(ACCESS, value == null ? "" : value)
                .httpOnly(true)
                .secure(secure)
                .path("/api")
                .maxAge(maxAge)
                .sameSite("Lax")
                .build();
    }

    private static ResponseCookie refreshCookie(String value, Duration maxAge, boolean secure) {
        return ResponseCookie.from(REFRESH, value == null ? "" : value)
                .httpOnly(true)
                .secure(secure)
                .path("/api/auth")
                .maxAge(maxAge)
                .sameSite("Lax")
                .build();
    }
}

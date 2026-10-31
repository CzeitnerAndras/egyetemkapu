package com.egyetemkapu.security;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AuthCookiesTest {

    @Test
    void writesHttpOnlySessionCookies() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        AuthCookies.setAccess(response, "jwt", true);
        AuthCookies.setRefresh(response, "raw", false);

        List<String> cookies = response.getHeaders(HttpHeaders.SET_COOKIE);
        String access = cookies.get(0);
        String refresh = cookies.get(1);
        assertTrue(access.startsWith("ek_access=jwt"));
        assertTrue(access.contains("Path=/api"));
        assertTrue(access.contains("Max-Age=900"));
        assertTrue(access.contains("HttpOnly"));
        assertTrue(access.contains("Secure"));
        assertTrue(access.contains("SameSite=Lax"));
        assertFalse(access.contains("Path=/api/auth"));
        assertTrue(refresh.startsWith("ek_refresh=raw"));
        assertTrue(refresh.contains("Path=/api/auth"));
        assertTrue(refresh.contains("Max-Age=604800"));
        assertTrue(refresh.contains("HttpOnly"));
        assertTrue(refresh.contains("SameSite=Lax"));
        assertFalse(refresh.contains("Secure"));
    }

    @Test
    void missingTokenIsWrittenAsAnEmptyCookie() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        AuthCookies.setAccess(response, null, false);

        String cookie = response.getHeader(HttpHeaders.SET_COOKIE);
        assertTrue(cookie.startsWith("ek_access="));
        assertFalse(cookie.startsWith("ek_access=null"));
        assertFalse(cookie.contains("Secure"));
    }

    @Test
    void clearingTheSessionExpiresBothCookies() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        AuthCookies.clearRefresh(response, true);

        List<String> cookies = response.getHeaders(HttpHeaders.SET_COOKIE);
        assertEquals(2, cookies.size());
        assertTrue(cookies.get(0).startsWith("ek_access="));
        assertTrue(cookies.get(0).contains("Max-Age=0"));
        assertTrue(cookies.get(1).startsWith("ek_refresh="));
        assertTrue(cookies.get(1).contains("Path=/api/auth"));
        assertTrue(cookies.get(1).contains("Max-Age=0"));
        assertTrue(cookies.get(1).contains("Secure"));
    }

    @Test
    void readsTheNamedCookieAndIgnoresAMissingJar() {
        MockHttpServletRequest empty = new MockHttpServletRequest();
        assertNull(AuthCookies.readAccess(empty));
        assertNull(AuthCookies.readRefresh(empty));
        assertFalse(AuthCookies.hasAuthCookie(empty));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(
                new Cookie("other", "x"),
                new Cookie(AuthCookies.ACCESS, "  "),
                new Cookie(AuthCookies.REFRESH, "raw"));
        assertEquals("  ", AuthCookies.readAccess(request));
        assertEquals("raw", AuthCookies.readRefresh(request));
        assertTrue(AuthCookies.hasAuthCookie(request));

        MockHttpServletRequest blank = new MockHttpServletRequest();
        blank.setCookies(new Cookie(AuthCookies.ACCESS, "   "));
        assertFalse(AuthCookies.hasAuthCookie(blank));
    }
}

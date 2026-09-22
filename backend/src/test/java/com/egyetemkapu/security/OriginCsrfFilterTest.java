package com.egyetemkapu.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OriginCsrfFilterTest {

    private final OriginCsrfFilter filter = new OriginCsrfFilter(SecurityConfig.DEFAULT_ALLOWED_ORIGINS);

    @Test
    void skipsSafeMethodsAndRequestsWithoutAuthCookies() throws Exception {
        MockHttpServletRequest get = new MockHttpServletRequest("GET", "/api/notes");
        get.setCookies(new jakarta.servlet.http.Cookie(AuthCookies.ACCESS, "jwt"));
        assertTrue(filter.shouldNotFilter(get));

        MockHttpServletRequest post = new MockHttpServletRequest("POST", "/api/auth/login");
        assertTrue(filter.shouldNotFilter(post));
    }

    @Test
    void rejectsMutatingCookieRequestFromUnknownOrigin() throws Exception {
        MockHttpServletRequest request = mutatingWithCookie();
        request.addHeader("Origin", "https://tamado.example");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(403, response.getStatus());
    }

    @Test
    void allowsMutatingCookieRequestFromSiteOrigin() throws Exception {
        MockHttpServletRequest request = mutatingWithCookie();
        request.addHeader("Origin", "https://egyetemkapu.hu");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(200, response.getStatus());
    }

    @Test
    void allowsRefererWhenOriginIsMissing() {
        MockHttpServletRequest request = mutatingWithCookie();
        request.addHeader("Referer", "http://localhost:5173/naptar");
        assertTrue(filter.isAllowed(request));
    }

    @Test
    void rejectsMissingOriginAndReferer() {
        assertFalse(filter.isAllowed(mutatingWithCookie()));
    }

    private static MockHttpServletRequest mutatingWithCookie() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/refresh");
        request.setCookies(new jakarta.servlet.http.Cookie(AuthCookies.REFRESH, "raw"));
        return request;
    }
}

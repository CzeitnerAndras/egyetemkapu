package com.egyetemkapu.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ClientIpResolverTest {

    private final ClientIpResolver resolver = new ClientIpResolver("127.0.0.1,::1,172.16.0.0/12");

    @Test
    void ignoresForwardedForWhenRemoteIsNotTrusted() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.10");
        request.addHeader("X-Forwarded-For", "1.2.3.4, 5.6.7.8");

        assertEquals("203.0.113.10", resolver.resolve(request));
    }

    @Test
    void usesRightmostUntrustedHopWhenRemoteIsTrustedProxy() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        request.addHeader("X-Forwarded-For", "1.2.3.4, 198.51.100.20");

        assertEquals("198.51.100.20", resolver.resolve(request));
    }

    @Test
    void skipsTrailingTrustedHopsAddedByProxies() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        request.addHeader("X-Forwarded-For", "198.51.100.20, 172.18.0.4");

        assertEquals("198.51.100.20", resolver.resolve(request));
    }

    @Test
    void fallsBackToRemoteWhenForwardedHeaderMissing() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");

        assertEquals("127.0.0.1", resolver.resolve(request));
    }

    @Test
    void treatsBlankRemoteAsUnknown() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("   ");

        assertEquals("unknown", resolver.resolve(request));
    }

    @Test
    void trustsLoopbackAndConfiguredCidr() {
        assertTrue(resolver.isTrusted("127.0.0.1"));
        assertTrue(resolver.isTrusted("::1"));
        assertTrue(resolver.isTrusted("172.18.0.4"));
        assertFalse(resolver.isTrusted("203.0.113.10"));
        assertFalse(resolver.isTrusted("10.0.0.1"));
    }
}

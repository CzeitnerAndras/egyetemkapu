package com.egyetemkapu.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class SecurityConfigTest {

    private static final String DEFAULTS = SecurityConfig.DEFAULT_ALLOWED_ORIGINS;

    private CorsConfiguration corsConfigFor(String origins) {
        SecurityConfig config = new SecurityConfig(null, null, false, origins);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        CorsConfiguration configuration = config.corsConfigurationSource().getCorsConfiguration(request);
        assertNotNull(configuration, "a /api/** útvonalra kell CORS beállítás");
        return configuration;
    }

    @Test
    void allowsProductionOriginByDefault() {
        CorsConfiguration configuration = corsConfigFor(DEFAULTS);

        assertEquals("https://egyetemkapu.hu", configuration.checkOrigin("https://egyetemkapu.hu"));
        assertEquals("https://www.egyetemkapu.hu", configuration.checkOrigin("https://www.egyetemkapu.hu"));
    }

    @Test
    void allowsLocalDevelopmentOriginsByDefault() {
        CorsConfiguration configuration = corsConfigFor(DEFAULTS);

        assertEquals("http://localhost:5173", configuration.checkOrigin("http://localhost:5173"));
        assertEquals("http://localhost:3000", configuration.checkOrigin("http://localhost:3000"));
    }

    @Test
    void rejectsUnknownOrigin() {
        CorsConfiguration configuration = corsConfigFor(DEFAULTS);

        assertNull(configuration.checkOrigin("https://tamado.example"));
    }

    @Test
    void allowsLoginRequestMethodAndHeaders() {
        CorsConfiguration configuration = corsConfigFor(DEFAULTS);

        assertNotNull(configuration.checkHttpMethod(org.springframework.http.HttpMethod.POST));
        assertNotNull(configuration.checkHeaders(List.of("Content-Type")));
    }

    @Test
    void honoursOverriddenOriginList() {
        CorsConfiguration configuration = corsConfigFor("https://masik.example");

        assertEquals("https://masik.example", configuration.checkOrigin("https://masik.example"));
        assertNull(configuration.checkOrigin("https://egyetemkapu.hu"));
    }

    @Test
    void ignoresWhitespaceAroundConfiguredOrigins() {
        CorsConfiguration configuration = corsConfigFor(" https://egy.example , https://ketto.example ");

        assertEquals("https://egy.example", configuration.checkOrigin("https://egy.example"));
        assertEquals("https://ketto.example", configuration.checkOrigin("https://ketto.example"));
    }
}

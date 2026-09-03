package com.egyetemkapu.security;

import com.egyetemkapu.service.RateLimitingService;
import io.github.bucket4j.Bucket;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RateLimitFilterTest {

    @Mock
    private RateLimitingService rateLimitingService;

    @Mock
    private Bucket bucket;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private MockHttpServletResponse callFilter(String uri) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", uri);
        request.setRequestURI(uri);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        new RateLimitFilter(rateLimitingService).doFilter(request, response, chain);
        return response;
    }

    private void authenticateAs(String username) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(username, null, List.of()));
    }

    @Test
    void allowsPublicCalculatorCountWithoutLogin() throws Exception {
        MockHttpServletResponse response = callFilter("/api/tools/calculator/count");

        assertEquals(200, response.getStatus());
    }

    @Test
    void allowsCreditCalculatorWithoutLogin() throws Exception {
        MockHttpServletResponse response = callFilter("/api/calculator/weighted-average");

        assertEquals(200, response.getStatus());
    }

    @Test
    void rejectsOtherToolEndpointsWithoutLogin() throws Exception {
        MockHttpServletResponse response = callFilter("/api/tools/calculator/add/1+1");

        assertEquals(401, response.getStatus());
    }

    @Test
    void rejectsAiEndpointWithoutLogin() throws Exception {
        MockHttpServletResponse response = callFilter("/api/ai/ask");

        assertEquals(401, response.getStatus());
    }

    @Test
    void allowsAuthenticatedUserWithinLimit() throws Exception {
        authenticateAs("diak");
        when(rateLimitingService.resolveBucket("diak")).thenReturn(bucket);
        when(bucket.tryConsume(1)).thenReturn(true);

        MockHttpServletResponse response = callFilter("/api/ai/ask");

        assertEquals(200, response.getStatus());
    }

    @Test
    void rejectsAuthenticatedUserOverLimit() throws Exception {
        authenticateAs("diak");
        when(rateLimitingService.resolveBucket("diak")).thenReturn(bucket);
        when(bucket.tryConsume(1)).thenReturn(false);

        MockHttpServletResponse response = callFilter("/api/ai/ask");

        assertEquals(429, response.getStatus());
        assertNotNull(response.getContentAsString());
    }

    @Test
    void ignoresUnrelatedPaths() throws Exception {
        MockHttpServletResponse response = callFilter("/api/events");

        assertEquals(200, response.getStatus());
    }

    @Test
    void allowsForgotPasswordWithinLimit() throws Exception {
        when(rateLimitingService.resolveForgotPasswordBucket("127.0.0.1")).thenReturn(bucket);
        when(bucket.tryConsume(1)).thenReturn(true);

        MockHttpServletResponse response = callFilter("POST", "/api/auth/forgot-password");

        assertEquals(200, response.getStatus());
    }

    @Test
    void rejectsForgotPasswordOverLimit() throws Exception {
        when(rateLimitingService.resolveForgotPasswordBucket("127.0.0.1")).thenReturn(bucket);
        when(bucket.tryConsume(1)).thenReturn(false);

        MockHttpServletResponse response = callFilter("POST", "/api/auth/forgot-password");

        assertEquals(429, response.getStatus());
    }

    @Test
    void rejectsResetPasswordOverLimit() throws Exception {
        when(rateLimitingService.resolvePasswordResetBucket("127.0.0.1")).thenReturn(bucket);
        when(bucket.tryConsume(1)).thenReturn(false);

        MockHttpServletResponse response = callFilter("POST", "/api/auth/reset-password");

        assertEquals(429, response.getStatus());
    }

    private MockHttpServletResponse callFilter(String method, String uri) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(method, uri);
        request.setRequestURI(uri);
        request.setRemoteAddr("127.0.0.1");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        new RateLimitFilter(rateLimitingService).doFilter(request, response, chain);
        return response;
    }
}

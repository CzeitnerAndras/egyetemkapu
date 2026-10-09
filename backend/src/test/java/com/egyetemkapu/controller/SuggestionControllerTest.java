package com.egyetemkapu.controller;

import com.egyetemkapu.model.Suggestion;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.SuggestionRepository;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.ClientIpResolver;
import com.egyetemkapu.security.JwtUtil;
import com.egyetemkapu.service.RateLimitingService;
import com.egyetemkapu.service.RecaptchaService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SuggestionController.class)
@AutoConfigureMockMvc(addFilters = false)
class SuggestionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SuggestionRepository suggestionRepository;
    @MockitoBean
    private UserRepository userRepository;
    @MockitoBean
    private RecaptchaService recaptchaService;
    @MockitoBean
    private ClientIpResolver clientIpResolver;
    @MockitoBean
    private JwtUtil jwtUtil;
    @MockitoBean
    private RateLimitingService rateLimitingService;

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createSuggestion_guestWithAValidCaptchaIsStoredWithoutAUser() throws Exception {
        when(clientIpResolver.resolve(any())).thenReturn("1.2.3.4");
        when(recaptchaService.verify("token", "1.2.3.4")).thenReturn(true);
        when(suggestionRepository.save(any())).thenAnswer(invocation -> {
            Suggestion suggestion = invocation.getArgument(0);
            suggestion.setId(9L);
            return suggestion;
        });

        mockMvc.perform(post("/api/suggestions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Park\",\"description\":\"Legyen park.\",\"captchaToken\":\"token\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(9));

        verify(suggestionRepository).save(org.mockito.ArgumentMatchers.argThat(suggestion ->
                suggestion.getUser() == null
                        && "Park".equals(suggestion.getTitle())
                        && "Legyen park.".equals(suggestion.getDescription())));
    }

    @Test
    void createSuggestion_loggedInUserIsAttached() throws Exception {
        User anna = new User();
        anna.setUsername("anna");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("anna", null, List.of()));
        when(userRepository.findByUsername("anna")).thenReturn(Optional.of(anna));
        when(clientIpResolver.resolve(any())).thenReturn("1.2.3.4");
        when(recaptchaService.verify(eq("token"), eq("1.2.3.4"))).thenReturn(true);
        when(suggestionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post("/api/suggestions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Park\",\"description\":\"Legyen park.\",\"captchaToken\":\"token\"}"))
                .andExpect(status().isOk());

        verify(suggestionRepository).save(org.mockito.ArgumentMatchers.argThat(suggestion -> suggestion.getUser() == anna));
    }

    @Test
    void createSuggestion_failedCaptchaIsRejected() throws Exception {
        when(clientIpResolver.resolve(any())).thenReturn("1.2.3.4");
        when(recaptchaService.verify("bad", "1.2.3.4")).thenReturn(false);

        mockMvc.perform(post("/api/suggestions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Park\",\"description\":\"Legyen park.\",\"captchaToken\":\"bad\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("captcha"));

        verify(suggestionRepository, never()).save(any());
    }
}

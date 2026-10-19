package com.egyetemkapu.controller;

import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.ClientIpResolver;
import com.egyetemkapu.security.JwtUtil;
import com.egyetemkapu.service.AiService;
import com.egyetemkapu.service.RateLimitingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AiController.class)
@AutoConfigureMockMvc(addFilters = false)
class AiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AiService aiService;
    @MockitoBean
    private UserRepository userRepository;
    @MockitoBean
    private JwtUtil jwtUtil;
    @MockitoBean
    private RateLimitingService rateLimitingService;
    @MockitoBean
    private ClientIpResolver clientIpResolver;

    @Test
    void askAi_returnsTheAssistantAnswer() throws Exception {
        when(aiService.askAi("Mi a derivált?")).thenReturn("A derivált a változás sebessége.");

        mockMvc.perform(post("/api/ai/ask")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"prompt\":\"Mi a derivált?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer").value("A derivált a változás sebessége."));
    }
}

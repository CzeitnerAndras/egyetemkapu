package com.egyetemkapu.controller;

import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.ClientIpResolver;
import com.egyetemkapu.security.JwtUtil;
import com.egyetemkapu.service.RateLimitingService;
import com.egyetemkapu.service.ReferenceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReferenceController.class)
@AutoConfigureMockMvc(addFilters = false)
class ReferenceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ReferenceService referenceService;
    @MockitoBean
    private UserRepository userRepository;
    @MockitoBean
    private JwtUtil jwtUtil;
    @MockitoBean
    private RateLimitingService rateLimitingService;
    @MockitoBean
    private ClientIpResolver clientIpResolver;

    @Test
    void generate_returnsTheFormattedReferenceAndUppercaseStyle() throws Exception {
        when(referenceService.generateReference(any())).thenReturn("Kovács (2024). Cím.");

        mockMvc.perform(post("/api/tools/reference/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "author": "Kovács",
                                  "title": "Cím",
                                  "year": "2024",
                                  "publisher": "Egyetem",
                                  "style": "apa"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.style").value("APA"))
                .andExpect(jsonPath("$.reference").value("Kovács (2024). Cím."));
    }
}

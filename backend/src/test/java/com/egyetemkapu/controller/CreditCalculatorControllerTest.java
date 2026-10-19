package com.egyetemkapu.controller;

import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.ClientIpResolver;
import com.egyetemkapu.security.JwtUtil;
import com.egyetemkapu.service.CreditCalculatorService;
import com.egyetemkapu.service.RateLimitingService;
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

@WebMvcTest(CreditCalculatorController.class)
@AutoConfigureMockMvc(addFilters = false)
class CreditCalculatorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CreditCalculatorService calculatorService;
    @MockitoBean
    private UserRepository userRepository;
    @MockitoBean
    private JwtUtil jwtUtil;
    @MockitoBean
    private RateLimitingService rateLimitingService;
    @MockitoBean
    private ClientIpResolver clientIpResolver;

    @Test
    void calculate_roundsTheAverageToTwoDecimals() throws Exception {
        when(calculatorService.calculateWeightedAverage(any())).thenReturn(4.256);

        mockMvc.perform(post("/api/calculator/weighted-average")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[{\"name\":\"Analízis\",\"credit\":5,\"grade\":5}]"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.average").value(4.26))
                .andExpect(jsonPath("$.message").value("Sikeresen kiszámítva!"));
    }
}

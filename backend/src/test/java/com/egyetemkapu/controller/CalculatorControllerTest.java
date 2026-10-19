package com.egyetemkapu.controller;

import com.egyetemkapu.repository.SystemAuditLogRepository;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.ClientIpResolver;
import com.egyetemkapu.security.JwtUtil;
import com.egyetemkapu.service.CalculatorService;
import com.egyetemkapu.service.RateLimitingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CalculatorController.class)
@AutoConfigureMockMvc(addFilters = false)
class CalculatorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CalculatorService calculatorService;
    @MockitoBean
    private SystemAuditLogRepository auditLogRepository;
    @MockitoBean
    private UserRepository userRepository;
    @MockitoBean
    private JwtUtil jwtUtil;
    @MockitoBean
    private RateLimitingService rateLimitingService;
    @MockitoBean
    private ClientIpResolver clientIpResolver;

    @Test
    void getSolvedCount_returnsTheAuditTotal() throws Exception {
        when(auditLogRepository.countByAction("Komplex számológép hívás")).thenReturn(12L);

        mockMvc.perform(get("/api/tools/calculator/count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(12));
    }

    @Test
    void calculateExternal_requiresASignedInUser() throws Exception {
        mockMvc.perform(get("/api/tools/calculator/simplify/x"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Bejelentkezés szükséges a számológép használatához!"));
    }

    @Test
    void calculateExternal_returnsTheServiceResult() throws Exception {
        when(calculatorService.calculateComplex("simplify", "x", "anna"))
                .thenReturn(Map.of("result", "x"));

        mockMvc.perform(get("/api/tools/calculator/simplify/x").principal(() -> "anna"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("x"));
    }
}

package com.egyetemkapu.controller;

import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.ClientIpResolver;
import com.egyetemkapu.security.JwtUtil;
import com.egyetemkapu.service.ActiveUserService;
import com.egyetemkapu.service.RateLimitingService;
import com.egyetemkapu.service.UserAccountService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@AutoConfigureMockMvc(addFilters = false)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserRepository userRepository;
    @MockitoBean
    private PasswordEncoder passwordEncoder;
    @MockitoBean
    private JwtUtil jwtUtil;
    @MockitoBean
    private UserAccountService userAccountService;
    @MockitoBean
    private ActiveUserService activeUserService;
    @MockitoBean
    private RateLimitingService rateLimitingService;
    @MockitoBean
    private ClientIpResolver clientIpResolver;

    @Test
    void count_returnsActiveVisitors() throws Exception {
        when(activeUserService.countActive()).thenReturn(7);

        mockMvc.perform(get("/api/users/count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(7));
    }

    @Test
    void heartbeat_recordsVisitorAndReturnsCount() throws Exception {
        when(activeUserService.countActive()).thenReturn(2);

        mockMvc.perform(post("/api/users/heartbeat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"visitorId\":\"11111111-1111-4111-8111-111111111111\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(2));

        verify(activeUserService).heartbeat("11111111-1111-4111-8111-111111111111");
    }
}

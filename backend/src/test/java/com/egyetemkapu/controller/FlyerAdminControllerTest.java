package com.egyetemkapu.controller;

import com.egyetemkapu.dto.FlyerSyncRunDto;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.ClientIpResolver;
import com.egyetemkapu.security.JwtUtil;
import com.egyetemkapu.service.FlyerSyncLog;
import com.egyetemkapu.service.RateLimitingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FlyerAdminController.class)
@AutoConfigureMockMvc(addFilters = false)
class FlyerAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FlyerSyncLog flyerSyncLog;
    @MockitoBean
    private UserRepository userRepository;
    @MockitoBean
    private JwtUtil jwtUtil;
    @MockitoBean
    private RateLimitingService rateLimitingService;
    @MockitoBean
    private ClientIpResolver clientIpResolver;

    @Test
    void listsTheLatestSyncRunForEachStore() throws Exception {
        LocalDateTime finished = LocalDateTime.of(2026, 10, 29, 6, 32);
        when(flyerSyncLog.latest()).thenReturn(List.of(
                new FlyerSyncRunDto("aldi", "failed", finished.minusMinutes(2), finished, 0, "aldi down"),
                FlyerSyncRunDto.never("metro")));

        mockMvc.perform(get("/api/flyers/admin/sync-runs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].store").value("aldi"))
                .andExpect(jsonPath("$[0].status").value("failed"))
                .andExpect(jsonPath("$[0].errorMessage").value("aldi down"))
                .andExpect(jsonPath("$[1].store").value("metro"))
                .andExpect(jsonPath("$[1].status").value("never"))
                .andExpect(jsonPath("$[1].productCount").value(0));
    }
}

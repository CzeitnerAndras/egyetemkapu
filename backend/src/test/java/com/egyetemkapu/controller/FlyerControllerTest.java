package com.egyetemkapu.controller;

import com.egyetemkapu.dto.FlyerDetailDto;
import com.egyetemkapu.dto.FlyerSearchHitDto;
import com.egyetemkapu.dto.FlyerSummaryDto;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.ClientIpResolver;
import com.egyetemkapu.security.JwtUtil;
import com.egyetemkapu.service.FlyerPageProxyService;
import com.egyetemkapu.service.FlyerQueryService;
import com.egyetemkapu.service.RateLimitingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FlyerController.class)
@AutoConfigureMockMvc(addFilters = false)
class FlyerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FlyerQueryService flyerQueryService;
    @MockitoBean
    private FlyerPageProxyService flyerPageProxyService;
    @MockitoBean
    private JwtUtil jwtUtil;
    @MockitoBean
    private RateLimitingService rateLimitingService;
    @MockitoBean
    private UserRepository userRepository;
    @MockitoBean
    private ClientIpResolver clientIpResolver;

    @Test
    void listsFlyersWithoutAuth() throws Exception {
        when(flyerQueryService.list(null)).thenReturn(List.of(
                new FlyerSummaryDto(1L, "aldi", "ALDI heti újság", "https://szorolap.aldi.hu/x/", LocalDate.of(2026, 9, 3), LocalDate.of(2026, 9, 9), 12, 4)
        ));

        mockMvc.perform(get("/api/flyers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].store").value("aldi"))
                .andExpect(jsonPath("$[0].title").value("ALDI heti újság"));
    }

    @Test
    void flyerDetailDoesNotCache() throws Exception {
        when(flyerQueryService.get(1L)).thenReturn(new FlyerDetailDto(
                1L, "aldi", "ALDI heti újság", "https://szorolap.aldi.hu/x/",
                LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 16),
                List.of(), List.of()));

        mockMvc.perform(get("/api/flyers/1"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("no-store")));
    }

    @Test
    void searchesWithoutAuth() throws Exception {
        when(flyerQueryService.search("kakaoscsiga")).thenReturn(List.of(
                new FlyerSearchHitDto(1L, "aldi", "ALDI", 2, "Kakaóscsiga", "Kakaóscsiga", "product", 11L)
        ));

        mockMvc.perform(get("/api/flyers/search").param("q", "kakaoscsiga"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].productName").value("Kakaóscsiga"));
    }
}

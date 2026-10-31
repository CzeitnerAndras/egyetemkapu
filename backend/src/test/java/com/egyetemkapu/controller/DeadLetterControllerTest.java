package com.egyetemkapu.controller;

import com.egyetemkapu.dto.DeadFlyerSyncDto;
import com.egyetemkapu.dto.DeadLetterQueueDto;
import com.egyetemkapu.dto.DeadReminderDto;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.ClientIpResolver;
import com.egyetemkapu.security.JwtUtil;
import com.egyetemkapu.service.DeadLetterService;
import com.egyetemkapu.service.RateLimitingService;
import com.egyetemkapu.service.ReminderRetry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DeadLetterController.class)
@AutoConfigureMockMvc(addFilters = false)
class DeadLetterControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DeadLetterService deadLetterService;
    @MockitoBean
    private UserRepository userRepository;
    @MockitoBean
    private JwtUtil jwtUtil;
    @MockitoBean
    private RateLimitingService rateLimitingService;
    @MockitoBean
    private ClientIpResolver clientIpResolver;

    @Test
    void listsDeadRemindersAndFailedSyncs() throws Exception {
        when(deadLetterService.list()).thenReturn(new DeadLetterQueueDto(
                List.of(new DeadReminderDto(4L, "DISCORD", "AT_DEADLINE", 5, "discord 503",
                        LocalDateTime.of(2026, 9, 1, 8, 0), "most lejár")),
                List.of(new DeadFlyerSyncDto("aldi", "aldi down", LocalDateTime.of(2026, 10, 29, 6, 31)))));

        mockMvc.perform(get("/api/admin/dead-letters"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reminders[0].lastError").value("discord 503"))
                .andExpect(jsonPath("$.flyerSyncs[0].store").value("aldi"));
    }

    @Test
    void retryingASentReminderDoesNotSendAgain() throws Exception {
        when(deadLetterService.retryReminder(4L)).thenReturn(ReminderRetry.ALREADY_SENT);

        mockMvc.perform(post("/api/admin/dead-letters/reminders/4/retry"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.result").value("ALREADY_SENT"));
    }

    @Test
    void retryingADeadReminderIsAcceptedOnce() throws Exception {
        when(deadLetterService.retryReminder(4L)).thenReturn(ReminderRetry.REQUEUED);

        mockMvc.perform(post("/api/admin/dead-letters/reminders/4/retry"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("REQUEUED"));

        verify(deadLetterService).retryReminder(4L);
    }

    @Test
    void aBusyFlyerRetryDoesNotStartASecondSync() throws Exception {
        when(deadLetterService.retryFlyer("aldi")).thenReturn(false);

        mockMvc.perform(post("/api/admin/dead-letters/flyers/aldi/retry"))
                .andExpect(status().isConflict());

        verify(deadLetterService).retryFlyer("aldi");
        verify(deadLetterService, never()).retryReminder(org.mockito.ArgumentMatchers.anyLong());
    }
}

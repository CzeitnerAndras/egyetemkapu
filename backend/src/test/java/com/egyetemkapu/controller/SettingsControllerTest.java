package com.egyetemkapu.controller;

import com.egyetemkapu.model.Settings;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.SettingsRepository;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.ClientIpResolver;
import com.egyetemkapu.security.JwtUtil;
import com.egyetemkapu.service.RateLimitingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.mockito.ArgumentCaptor;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SettingsController.class)
@AutoConfigureMockMvc(addFilters = false)
class SettingsControllerTest {

    private static final String WEBHOOK = "https://discord.com/api/webhooks/123456/abcdefgh";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SettingsRepository settingsRepository;
    @MockitoBean
    private UserRepository userRepository;
    @MockitoBean
    private JwtUtil jwtUtil;
    @MockitoBean
    private RateLimitingService rateLimitingService;
    @MockitoBean
    private ClientIpResolver clientIpResolver;

    @Test
    void getSettings_withoutASessionReturns401() throws Exception {
        mockMvc.perform(get("/api/settings"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getSettings_returnsAnEmptyObjectWhenNothingIsStored() throws Exception {
        User anna = user();
        when(userRepository.findByUsername("anna")).thenReturn(Optional.of(anna));
        when(settingsRepository.findByUser(anna)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/settings").principal(() -> "anna"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void getSettings_returnsTheStoredChannels() throws Exception {
        User anna = user();
        Settings settings = new Settings();
        settings.setDiscordWebhook(WEBHOOK);
        settings.setTelegramChatId("42");
        when(userRepository.findByUsername("anna")).thenReturn(Optional.of(anna));
        when(settingsRepository.findByUser(anna)).thenReturn(Optional.of(settings));

        mockMvc.perform(get("/api/settings").principal(() -> "anna"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.discordWebhook").value(WEBHOOK))
                .andExpect(jsonPath("$.telegramChatId").value("42"));
    }

    @Test
    void saveSettings_rejectsAWebhookOutsideDiscord() throws Exception {
        when(userRepository.findByUsername("anna")).thenReturn(Optional.of(user()));

        mockMvc.perform(put("/api/settings")
                        .principal(() -> "anna")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"discordWebhook\":\"https://evil.example/hook\",\"telegramChatId\":\"42\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(
                        "Csak hivatalos Discord webhook URL menthető (https://discord.com/api/webhooks/...)."));
    }

    @Test
    void saveSettings_rejectsANonNumericTelegramChatId() throws Exception {
        when(userRepository.findByUsername("anna")).thenReturn(Optional.of(user()));

        mockMvc.perform(put("/api/settings")
                        .principal(() -> "anna")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"discordWebhook\":\"\",\"telegramChatId\":\"abc\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("A Telegram chat ID csak szám lehet."));
    }

    @Test
    void saveSettings_storesABlankWebhookAsNullAndTrimsTheChatId() throws Exception {
        User anna = user();
        when(userRepository.findByUsername("anna")).thenReturn(Optional.of(anna));
        when(settingsRepository.findByUser(anna)).thenReturn(Optional.empty());

        mockMvc.perform(put("/api/settings")
                        .principal(() -> "anna")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"discordWebhook\":\"  \",\"telegramChatId\":\" 42 \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Beállítások elmentve!"));

        ArgumentCaptor<Settings> captor = ArgumentCaptor.forClass(Settings.class);
        verify(settingsRepository).save(captor.capture());
        assertEquals(anna, captor.getValue().getUser());
        assertNull(captor.getValue().getDiscordWebhook());
        assertEquals("42", captor.getValue().getTelegramChatId());
    }

    private static User user() {
        User user = new User();
        user.setId(1L);
        user.setUsername("anna");
        return user;
    }
}

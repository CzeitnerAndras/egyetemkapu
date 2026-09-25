package com.egyetemkapu.controller;

import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.ClientIpResolver;
import com.egyetemkapu.security.JwtUtil;
import com.egyetemkapu.security.UsernamePolicy;
import com.egyetemkapu.service.ActiveUserService;
import com.egyetemkapu.service.RateLimitingService;
import com.egyetemkapu.service.RefreshTokenService;
import com.egyetemkapu.service.UserAccountService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
    private RefreshTokenService refreshTokenService;
    @MockitoBean
    private RateLimitingService rateLimitingService;
    @MockitoBean
    private ClientIpResolver clientIpResolver;

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

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

    @Test
    void heartbeat_emptyPayloadStillReturnsCount() throws Exception {
        when(activeUserService.countActive()).thenReturn(0);

        mockMvc.perform(post("/api/users/heartbeat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(0));

        verify(activeUserService).heartbeat(null);
    }

    @Test
    void updateUsername_rejectsInvalidAndTakenNamesWithTheSameMessage() throws Exception {
        User current = user("anna");
        User other = user("bela");
        when(userRepository.findByUsername("anna")).thenReturn(Optional.of(current));
        when(userRepository.findByUsername("bela")).thenReturn(Optional.of(other));
        authenticate("anna");

        mockMvc.perform(put("/api/users/username")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newUsername\":\"a\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(UsernamePolicy.UNAVAILABLE_MESSAGE));

        mockMvc.perform(put("/api/users/username")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newUsername\":\"bela\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(UsernamePolicy.UNAVAILABLE_MESSAGE));

        verify(userRepository, never()).save(any());
    }

    @Test
    void updateUsername_savesAValidFreeName() throws Exception {
        User current = user("anna");
        when(userRepository.findByUsername("anna")).thenReturn(Optional.of(current));
        when(userRepository.findByUsername("uj.nev")).thenReturn(Optional.empty());
        when(jwtUtil.generateToken("uj.nev")).thenReturn("access-jwt");
        authenticate("anna");

        mockMvc.perform(put("/api/users/username")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newUsername\":\" uj.nev \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("uj.nev"));

        assertEquals("uj.nev", current.getUsername());
    }

    @Test
    void updatePassword_replacesTheRefreshToken() throws Exception {
        User current = user("anna");
        current.setPassword("old-hash");
        when(userRepository.findByUsername("anna")).thenReturn(Optional.of(current));
        when(passwordEncoder.matches("Regi123!", "old-hash")).thenReturn(true);
        when(passwordEncoder.encode("UjJelszo1!")).thenReturn("new-hash");
        when(jwtUtil.generateToken("anna")).thenReturn("access-jwt");
        when(refreshTokenService.createRefreshToken(4L))
                .thenReturn(new RefreshTokenService.IssuedRefreshToken("raw-refresh"));
        authenticate("anna");

        mockMvc.perform(put("/api/users/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"Regi123!\",\"newPassword\":\"UjJelszo1!\"}"))
                .andExpect(status().isOk())
                .andExpect(result -> {
                    List<String> cookies = result.getResponse().getHeaders(HttpHeaders.SET_COOKIE);
                    assertTrue(cookies.stream().anyMatch(cookie -> cookie.startsWith("ek_access=access-jwt")));
                    assertTrue(cookies.stream().anyMatch(cookie -> cookie.startsWith("ek_refresh=raw-refresh")));
                });

        assertEquals("new-hash", current.getPassword());
        var order = inOrder(refreshTokenService);
        order.verify(refreshTokenService).deleteByUserId(4L);
        order.verify(refreshTokenService).createRefreshToken(4L);
    }

    @Test
    void updatePassword_wrongCurrentPasswordKeepsTheSession() throws Exception {
        User current = user("anna");
        current.setPassword("old-hash");
        when(userRepository.findByUsername("anna")).thenReturn(Optional.of(current));
        when(passwordEncoder.matches("Rossz123!", "old-hash")).thenReturn(false);
        authenticate("anna");

        mockMvc.perform(put("/api/users/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"Rossz123!\",\"newPassword\":\"UjJelszo1!\"}"))
                .andExpect(status().isBadRequest());

        verify(refreshTokenService, never()).deleteByUserId(any());
        verify(refreshTokenService, never()).createRefreshToken(any());
    }

    private static User user(String username) {
        User user = new User();
        user.setId(4L);
        user.setUsername(username);
        return user;
    }

    private static void authenticate(String username) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(username, null, List.of()));
    }
}

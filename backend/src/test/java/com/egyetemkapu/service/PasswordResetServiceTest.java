package com.egyetemkapu.service;

import com.egyetemkapu.model.PasswordResetToken;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.PasswordResetTokenRepository;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.PasswordPolicy;
import com.egyetemkapu.security.PasswordResetTokens;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private RefreshTokenService refreshTokenService;
    @Mock private PasswordResetNotifier passwordResetNotifier;

    private PasswordResetService passwordResetService;

    @BeforeEach
    void setUp() {
        passwordResetService = new PasswordResetService(
                userRepository,
                passwordResetTokenRepository,
                passwordEncoder,
                refreshTokenService,
                passwordResetNotifier,
                "https://egyetemkapu.hu/");
    }

    @Test
    void requestReset_UnknownEmail_DoesNotCreateTokenOrNotify() {
        when(userRepository.findByEmailIgnoreCase("nincs@example.com")).thenReturn(Optional.empty());

        passwordResetService.requestReset("nincs@example.com");

        verify(passwordResetTokenRepository, never()).save(any());
        verify(passwordResetNotifier, never()).sendResetLink(any(), anyString());
    }

    @Test
    void requestReset_BlankEmail_DoesNothing() {
        passwordResetService.requestReset("  ");

        verify(userRepository, never()).findByEmailIgnoreCase(anyString());
        verify(passwordResetNotifier, never()).sendResetLink(any(), anyString());
    }

    @Test
    void requestReset_KnownEmail_SavesHashedTokenAndSendsLink() {
        User user = user(1L, "diak@egyetemkapu.hu");
        when(userRepository.findByEmailIgnoreCase("diak@egyetemkapu.hu")).thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findByUser(user)).thenReturn(Optional.empty());
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class))).thenAnswer(i -> i.getArgument(0));

        AtomicReference<String> sentUrl = new AtomicReference<>();
        org.mockito.Mockito.doAnswer(invocation -> {
            sentUrl.set(invocation.getArgument(1));
            return null;
        }).when(passwordResetNotifier).sendResetLink(eq(user), anyString());

        passwordResetService.requestReset("  diak@egyetemkapu.hu ");

        ArgumentCaptor<PasswordResetToken> tokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(passwordResetTokenRepository).save(tokenCaptor.capture());
        PasswordResetToken saved = tokenCaptor.getValue();

        assertEquals(user, saved.getUser());
        assertFalse(saved.isUsed());
        assertTrue(saved.getExpiryDate().isAfter(LocalDateTime.now().plusMinutes(50)));

        String url = sentUrl.get();
        assertTrue(url.startsWith("https://egyetemkapu.hu/uj-jelszo?token="));
        String rawToken = url.substring(url.indexOf("token=") + 6);
        assertEquals(PasswordResetTokens.hash(rawToken), saved.getTokenHash());
        assertFalse(url.contains(saved.getTokenHash()));
    }

    @Test
    void resetPassword_ValidToken_UpdatesPasswordClearsLockoutAndRevokesRefresh() {
        User user = user(9L, "diak@egyetemkapu.hu");
        user.setFailedLoginAttempts(5);
        user.setLockoutEndTime(LocalDateTime.now().plusMinutes(10));
        String rawToken = PasswordResetTokens.newRawToken();

        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        resetToken.setTokenHash(PasswordResetTokens.hash(rawToken));
        resetToken.setExpiryDate(LocalDateTime.now().plusHours(1));
        resetToken.setUsed(false);

        when(passwordResetTokenRepository.findByTokenHash(PasswordResetTokens.hash(rawToken)))
                .thenReturn(Optional.of(resetToken));
        when(passwordEncoder.encode("Titkos123!")).thenReturn("encoded");
        when(userRepository.save(user)).thenReturn(user);
        when(passwordResetTokenRepository.save(resetToken)).thenReturn(resetToken);

        Optional<String> error = passwordResetService.resetPassword(rawToken, "Titkos123!");

        assertTrue(error.isEmpty());
        assertEquals("encoded", user.getPassword());
        assertEquals(0, user.getFailedLoginAttempts());
        assertNull(user.getLockoutEndTime());
        assertTrue(resetToken.isUsed());
        verify(refreshTokenService).deleteByUserId(9L);
    }

    @Test
    void resetPassword_ExpiredToken_ReturnsError() {
        String rawToken = PasswordResetTokens.newRawToken();
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUsed(false);
        resetToken.setExpiryDate(LocalDateTime.now().minusMinutes(1));
        resetToken.setTokenHash(PasswordResetTokens.hash(rawToken));

        when(passwordResetTokenRepository.findByTokenHash(PasswordResetTokens.hash(rawToken)))
                .thenReturn(Optional.of(resetToken));

        Optional<String> error = passwordResetService.resetPassword(rawToken, "Titkos123!");

        assertEquals(PasswordResetService.INVALID_TOKEN_MESSAGE, error.orElseThrow());
        verify(userRepository, never()).save(any());
        verify(refreshTokenService, never()).deleteByUserId(any());
    }

    @Test
    void resetPassword_UsedToken_ReturnsError() {
        String rawToken = PasswordResetTokens.newRawToken();
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUsed(true);
        resetToken.setExpiryDate(LocalDateTime.now().plusHours(1));
        resetToken.setTokenHash(PasswordResetTokens.hash(rawToken));

        when(passwordResetTokenRepository.findByTokenHash(PasswordResetTokens.hash(rawToken)))
                .thenReturn(Optional.of(resetToken));

        Optional<String> error = passwordResetService.resetPassword(rawToken, "Titkos123!");

        assertEquals(PasswordResetService.INVALID_TOKEN_MESSAGE, error.orElseThrow());
        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPassword_UnknownToken_ReturnsError() {
        when(passwordResetTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        Optional<String> error = passwordResetService.resetPassword("nincs-ilyen", "Titkos123!");

        assertEquals(PasswordResetService.INVALID_TOKEN_MESSAGE, error.orElseThrow());
    }

    @Test
    void resetPassword_WeakPassword_ReturnsPolicyErrorWithoutLookup() {
        Optional<String> error = passwordResetService.resetPassword("token", "gyenge");

        assertEquals(PasswordPolicy.WEAK_PASSWORD_MESSAGE, error.orElseThrow());
        verify(passwordResetTokenRepository, never()).findByTokenHash(anyString());
    }

    private static User user(Long id, String email) {
        User user = new User();
        user.setId(id);
        user.setUsername("diak");
        user.setEmail(email);
        user.setPassword("old");
        return user;
    }
}

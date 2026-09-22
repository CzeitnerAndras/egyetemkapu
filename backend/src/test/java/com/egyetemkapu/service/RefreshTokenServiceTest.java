package com.egyetemkapu.service;

import com.egyetemkapu.exception.TokenRefreshException;
import com.egyetemkapu.model.RefreshToken;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.RefreshTokenRepository;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.PasswordResetTokens;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private RefreshTokenService refreshTokenService;

    @Test
    void createRefreshToken_ExistingToken_ReusesRowAndStoresHash() {
        User user = new User();
        user.setId(1L);
        RefreshToken existing = new RefreshToken();
        existing.setId(42L);
        existing.setUser(user);
        existing.setToken("regi-token");
        existing.setExpiryDate(LocalDateTime.now().plusDays(1));

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(refreshTokenRepository.findByUser(user)).thenReturn(Optional.of(existing));
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(i -> i.getArgument(0));

        RefreshTokenService.IssuedRefreshToken issued = refreshTokenService.createRefreshToken(1L);

        assertEquals(42L, existing.getId());
        assertEquals(PasswordResetTokens.hash(issued.rawToken()), existing.getToken());
        assertNotEquals(issued.rawToken(), existing.getToken());
        verify(refreshTokenRepository, never()).deleteByUser(any());
    }

    @Test
    void createRefreshToken_NoExistingToken_CreatesHashedToken() {
        User user = new User();
        user.setId(1L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(refreshTokenRepository.findByUser(user)).thenReturn(Optional.empty());
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(i -> i.getArgument(0));

        RefreshTokenService.IssuedRefreshToken issued = refreshTokenService.createRefreshToken(1L);

        assertFalse(issued.rawToken().isBlank());
        verify(refreshTokenRepository).save(argThat(saved ->
                saved.getUser().equals(user)
                        && PasswordResetTokens.hash(issued.rawToken()).equals(saved.getToken())
                        && saved.getExpiryDate().isAfter(LocalDateTime.now())));
    }

    @Test
    void findByRawToken_LooksUpSha256Hash() {
        when(refreshTokenRepository.findByToken(PasswordResetTokens.hash("nyers")))
                .thenReturn(Optional.of(new RefreshToken()));

        assertTrue(refreshTokenService.findByRawToken("nyers").isPresent());
        assertTrue(refreshTokenService.findByRawToken(" ").isEmpty());
    }

    @Test
    void rotate_ReplacesHashAndExtendsExpiry() {
        RefreshToken current = new RefreshToken();
        current.setToken("regi-hash");
        current.setExpiryDate(LocalDateTime.now().plusDays(1));
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(i -> i.getArgument(0));

        RefreshTokenService.IssuedRefreshToken rotated = refreshTokenService.rotate(current);

        assertEquals(PasswordResetTokens.hash(rotated.rawToken()), current.getToken());
        assertNotEquals("regi-hash", current.getToken());
        assertTrue(current.getExpiryDate().isAfter(LocalDateTime.now().plusDays(6)));
    }

    @Test
    void verifyExpiration_TokenNotExpired_ReturnsToken() {
        RefreshToken token = new RefreshToken();
        token.setExpiryDate(LocalDateTime.now().plusDays(1));

        RefreshToken result = refreshTokenService.verifyExpiration(token);

        assertNotNull(result);
        assertEquals(token, result);
        verify(refreshTokenRepository, never()).delete(any());
    }

    @Test
    void verifyExpiration_TokenExpired_ThrowsExceptionAndDeletes() {
        RefreshToken token = new RefreshToken();
        token.setExpiryDate(LocalDateTime.now().minusDays(1));

        TokenRefreshException exception = assertThrows(TokenRefreshException.class, () -> {
            refreshTokenService.verifyExpiration(token);
        });

        assertEquals("A Refresh Token lejárt! Kérlek, jelentkezz be újra.", exception.getMessage());
        verify(refreshTokenRepository, times(1)).delete(token);
    }
}

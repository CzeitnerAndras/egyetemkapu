package com.egyetemkapu.service;

import com.egyetemkapu.model.RefreshToken;
import com.egyetemkapu.repository.RefreshTokenRepository;
import com.egyetemkapu.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

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

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            refreshTokenService.verifyExpiration(token);
        });

        assertEquals("A Refresh Token lejárt! Kérlek, jelentkezz be újra.", exception.getMessage());
        verify(refreshTokenRepository, times(1)).delete(token); 
    }
}
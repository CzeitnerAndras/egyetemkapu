package com.egyetemkapu.service;

import com.egyetemkapu.model.RefreshToken;
import com.egyetemkapu.repository.RefreshTokenRepository;
import com.egyetemkapu.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository, UserRepository userRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public RefreshToken createRefreshToken(Long userId) {
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(userRepository.findById(userId).orElseThrow(() -> new RuntimeException("Felhasználó nem található")));
        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setExpiryDate(LocalDateTime.now().plusDays(7));
        refreshTokenRepository.deleteByUser(refreshToken.getUser());
        
        return refreshTokenRepository.save(refreshToken);
    }

    public Optional<RefreshToken> findByToken(String token) {
        return refreshTokenRepository.findByToken(token);
    }

    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getExpiryDate().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(token);
            throw new RuntimeException("A Refresh Token lejárt! Kérlek, jelentkezz be újra.");
        }
        return token;
    }

    @Transactional
    public void deleteByUserId(Long userId) {
        userRepository.findById(userId).ifPresent(refreshTokenRepository::deleteByUser);
    }
}
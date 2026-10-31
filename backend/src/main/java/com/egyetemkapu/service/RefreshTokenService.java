package com.egyetemkapu.service;

import com.egyetemkapu.exception.TokenRefreshException;
import com.egyetemkapu.model.RefreshToken;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.RefreshTokenRepository;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.AuthCookies;
import com.egyetemkapu.security.PasswordResetTokens;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class RefreshTokenService {

    public record IssuedRefreshToken(String rawToken) {
    }

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository, UserRepository userRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.userRepository = userRepository;
    }

    // --- Create ---
    @Transactional
    public IssuedRefreshToken createRefreshToken(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Felhasználó nem található"));

        RefreshToken refreshToken = refreshTokenRepository.findByUser(user)
                .orElseGet(() -> {
                    RefreshToken created = new RefreshToken();
                    created.setUser(user);
                    return created;
                });

        String rawToken = PasswordResetTokens.newRawToken();
        refreshToken.setPreviousToken(null);
        refreshToken.setToken(PasswordResetTokens.hash(rawToken));
        refreshToken.setExpiryDate(LocalDateTime.now().plus(AuthCookies.REFRESH_TTL));
        refreshTokenRepository.save(refreshToken);
        return new IssuedRefreshToken(rawToken);
    }

    public Optional<RefreshToken> findByRawToken(String rawToken) {
        String hash = PasswordResetTokens.hash(rawToken);
        if (hash.isEmpty()) {
            return Optional.empty();
        }
        return refreshTokenRepository.findByToken(hash);
    }

    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getExpiryDate().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(token);
            throw new TokenRefreshException("A Refresh Token lejárt! Kérlek, jelentkezz be újra.");
        }
        return token;
    }

    // --- Rotate ---
    @Transactional
    public IssuedRefreshToken rotate(RefreshToken current) {
        verifyExpiration(current);
        String rawToken = PasswordResetTokens.newRawToken();
        current.setPreviousToken(current.getToken());
        current.setToken(PasswordResetTokens.hash(rawToken));
        current.setExpiryDate(LocalDateTime.now().plus(AuthCookies.REFRESH_TTL));
        refreshTokenRepository.save(current);
        return new IssuedRefreshToken(rawToken);
    }

    // --- End session ---
    @Transactional
    public void endSession(User user) {
        user.setSessionVersion(user.getSessionVersion() + 1);
        userRepository.save(user);
        refreshTokenRepository.deleteByUser(user);
    }

    @Transactional
    public boolean revokeIfReused(String rawToken) {
        String hash = PasswordResetTokens.hash(rawToken);
        if (hash.isEmpty()) {
            return false;
        }
        Optional<RefreshToken> previous = refreshTokenRepository.findByPreviousToken(hash);
        if (previous.isEmpty()) {
            return false;
        }
        endSession(previous.get().getUser());
        return true;
    }
}

package com.egyetemkapu.service;

import com.egyetemkapu.model.PasswordResetToken;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.PasswordResetTokenRepository;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.PasswordPolicy;
import com.egyetemkapu.security.PasswordResetTokens;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class PasswordResetService {

    public static final String REQUEST_ACCEPTED_MESSAGE =
            "Ha ez az e-mail cím regisztrálva van, elküldtük a visszaállító linket.";
    public static final String INVALID_TOKEN_MESSAGE =
            "Érvénytelen vagy lejárt visszaállító link.";
    public static final String RESET_SUCCESS_MESSAGE =
            "A jelszó sikeresen frissítve. Most már bejelentkezhetsz.";

    private static final int TOKEN_TTL_HOURS = 1;

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;
    private final PasswordResetNotifier passwordResetNotifier;
    private final String publicAppUrl;

    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            PasswordEncoder passwordEncoder,
            RefreshTokenService refreshTokenService,
            PasswordResetNotifier passwordResetNotifier,
            @Value("${app.public-url:http://localhost:5173}") String publicAppUrl) {
        this.userRepository = userRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenService = refreshTokenService;
        this.passwordResetNotifier = passwordResetNotifier;
        this.publicAppUrl = trimTrailingSlash(publicAppUrl);
    }

    @Transactional
    public void requestReset(String email) {
        if (email == null || email.isBlank()) {
            return;
        }

        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email.trim());
        if (userOpt.isEmpty()) {
            return;
        }

        User user = userOpt.get();
        String rawToken = PasswordResetTokens.newRawToken();

        PasswordResetToken resetToken = passwordResetTokenRepository.findByUser(user)
                .orElseGet(() -> {
                    PasswordResetToken created = new PasswordResetToken();
                    created.setUser(user);
                    return created;
                });
        resetToken.setTokenHash(PasswordResetTokens.hash(rawToken));
        resetToken.setExpiryDate(LocalDateTime.now().plusHours(TOKEN_TTL_HOURS));
        resetToken.setUsed(false);
        passwordResetTokenRepository.save(resetToken);

        passwordResetNotifier.sendResetLink(user, publicAppUrl + "/uj-jelszo?token=" + rawToken);
    }

    @Transactional
    public Optional<String> resetPassword(String rawToken, String newPassword) {
        if (!PasswordPolicy.isValid(newPassword)) {
            return Optional.of(PasswordPolicy.WEAK_PASSWORD_MESSAGE);
        }

        String tokenHash = PasswordResetTokens.hash(rawToken);
        if (tokenHash.isEmpty()) {
            return Optional.of(INVALID_TOKEN_MESSAGE);
        }

        Optional<PasswordResetToken> tokenOpt = passwordResetTokenRepository.findByTokenHash(tokenHash);
        if (tokenOpt.isEmpty()) {
            return Optional.of(INVALID_TOKEN_MESSAGE);
        }

        PasswordResetToken resetToken = tokenOpt.get();
        if (resetToken.isUsed() || resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            return Optional.of(INVALID_TOKEN_MESSAGE);
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setFailedLoginAttempts(0);
        user.setLockoutEndTime(null);
        userRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);
        refreshTokenService.deleteByUserId(user.getId());

        return Optional.empty();
    }

    private static String trimTrailingSlash(String url) {
        if (url == null || url.isBlank()) {
            return "http://localhost:5173";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}

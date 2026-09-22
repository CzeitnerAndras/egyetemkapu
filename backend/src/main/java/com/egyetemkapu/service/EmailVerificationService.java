package com.egyetemkapu.service;

import com.egyetemkapu.model.EmailVerificationToken;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.EmailVerificationTokenRepository;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.PasswordResetTokens;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class EmailVerificationService {

    public static final String ACCEPTED_MESSAGE =
            "Ha ez az e-mail még nem volt regisztrálva, küldtünk egy megerősítő linket.";
    public static final String INVALID_TOKEN_MESSAGE = "Érvénytelen vagy lejárt megerősítő link.";
    public static final String VERIFIED_MESSAGE = "Az e-mail cím megerősítve. Most már bejelentkezhetsz.";

    private static final int TOKEN_TTL_HOURS = 24;

    private final UserRepository userRepository;
    private final EmailVerificationTokenRepository tokenRepository;
    private final PasswordResetNotifier notifier;
    private final String publicAppUrl;

    public EmailVerificationService(
            UserRepository userRepository,
            EmailVerificationTokenRepository tokenRepository,
            PasswordResetNotifier notifier,
            @Value("${app.public-url:http://localhost:5173}") String publicAppUrl) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.notifier = notifier;
        this.publicAppUrl = trimTrailingSlash(publicAppUrl);
    }

    @Transactional
    public void issueFor(User user) {
        String rawToken = PasswordResetTokens.newRawToken();
        EmailVerificationToken token = tokenRepository.findByUser(user)
                .orElseGet(() -> {
                    EmailVerificationToken created = new EmailVerificationToken();
                    created.setUser(user);
                    return created;
                });
        token.setTokenHash(PasswordResetTokens.hash(rawToken));
        token.setExpiryDate(LocalDateTime.now().plusHours(TOKEN_TTL_HOURS));
        tokenRepository.save(token);
        notifier.sendVerificationLink(user, publicAppUrl + "/email-megerosites#token=" + rawToken);
    }

    @Transactional
    public Optional<String> verify(String rawToken) {
        String hash = PasswordResetTokens.hash(rawToken);
        if (hash.isEmpty()) {
            return Optional.of(INVALID_TOKEN_MESSAGE);
        }
        Optional<EmailVerificationToken> tokenOpt = tokenRepository.findByTokenHash(hash);
        if (tokenOpt.isEmpty()) {
            return Optional.of(INVALID_TOKEN_MESSAGE);
        }
        EmailVerificationToken token = tokenOpt.get();
        if (token.getExpiryDate().isBefore(LocalDateTime.now())) {
            tokenRepository.delete(token);
            return Optional.of(INVALID_TOKEN_MESSAGE);
        }
        User user = token.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);
        tokenRepository.delete(token);
        return Optional.empty();
    }

    private static String trimTrailingSlash(String url) {
        if (url == null || url.isBlank()) {
            return "http://localhost:5173";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}

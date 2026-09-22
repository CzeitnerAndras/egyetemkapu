package com.egyetemkapu.service;

import com.egyetemkapu.model.EmailVerificationToken;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.EmailVerificationTokenRepository;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.PasswordResetTokens;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailVerificationServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private EmailVerificationTokenRepository tokenRepository;
    @Mock private PasswordResetNotifier notifier;

    private EmailVerificationService service;

    @BeforeEach
    void setUp() {
        service = new EmailVerificationService(
                userRepository,
                tokenRepository,
                notifier,
                "https://egyetemkapu.hu/");
    }

    @Test
    void issueFor_SavesHashedTokenAndSendsLink() {
        User user = new User();
        user.setId(3L);
        user.setUsername("diak");
        when(tokenRepository.findByUser(user)).thenReturn(Optional.empty());
        when(tokenRepository.save(any(EmailVerificationToken.class))).thenAnswer(i -> i.getArgument(0));

        AtomicReference<String> sentUrl = new AtomicReference<>();
        org.mockito.Mockito.doAnswer(invocation -> {
            sentUrl.set(invocation.getArgument(1));
            return null;
        }).when(notifier).sendVerificationLink(eq(user), anyString());

        service.issueFor(user);

        ArgumentCaptor<EmailVerificationToken> captor = ArgumentCaptor.forClass(EmailVerificationToken.class);
        verify(tokenRepository).save(captor.capture());
        String rawToken = sentUrl.get().substring(sentUrl.get().indexOf("token=") + 6);
        assertTrue(sentUrl.get().startsWith("https://egyetemkapu.hu/email-megerosites#token="));
        assertEquals(PasswordResetTokens.hash(rawToken), captor.getValue().getTokenHash());
        assertTrue(captor.getValue().getExpiryDate().isAfter(LocalDateTime.now().plusHours(23)));
    }

    @Test
    void verify_ValidToken_MarksUserVerifiedAndDeletesToken() {
        User user = new User();
        user.setEmailVerified(false);
        EmailVerificationToken token = new EmailVerificationToken();
        token.setUser(user);
        token.setTokenHash(PasswordResetTokens.hash("jo-token"));
        token.setExpiryDate(LocalDateTime.now().plusHours(1));
        when(tokenRepository.findByTokenHash(PasswordResetTokens.hash("jo-token"))).thenReturn(Optional.of(token));

        assertTrue(service.verify("jo-token").isEmpty());
        assertTrue(user.isEmailVerified());
        verify(userRepository).save(user);
        verify(tokenRepository).delete(token);
    }

    @Test
    void verify_UnknownOrExpiredToken_ReturnsGenericError() {
        when(tokenRepository.findByTokenHash(PasswordResetTokens.hash("nincs"))).thenReturn(Optional.empty());
        assertEquals(EmailVerificationService.INVALID_TOKEN_MESSAGE, service.verify("nincs").orElseThrow());

        EmailVerificationToken expired = new EmailVerificationToken();
        expired.setExpiryDate(LocalDateTime.now().minusMinutes(1));
        when(tokenRepository.findByTokenHash(PasswordResetTokens.hash("lejart"))).thenReturn(Optional.of(expired));
        assertEquals(EmailVerificationService.INVALID_TOKEN_MESSAGE, service.verify("lejart").orElseThrow());
        verify(tokenRepository).delete(expired);
    }
}

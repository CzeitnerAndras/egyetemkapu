package com.egyetemkapu.service;

import com.egyetemkapu.model.Settings;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.SettingsRepository;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Optional;
import java.util.Properties;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PasswordResetNotifierTest {

    @Mock private ObjectProvider<JavaMailSender> mailSenderProvider;
    @Mock private JavaMailSender mailSender;
    @Mock private NotificationSenderService notificationSenderService;
    @Mock private SettingsRepository settingsRepository;
    @Mock private Environment environment;

    @Test
    void sendResetLink_SendsEmailAndTelegramWhenConfigured() throws Exception {
        User user = new User();
        user.setEmail("diak@egyetemkapu.hu");
        user.setPreferredLanguage("hu");
        user.setUsername("diak");

        Settings settings = new Settings();
        settings.setTelegramChatId("12345");

        when(mailSenderProvider.getIfAvailable()).thenReturn(mailSender);
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        when(settingsRepository.findByUser(user)).thenReturn(Optional.of(settings));
        when(environment.acceptsProfiles(any(Profiles.class))).thenReturn(false);

        notifier("smtp.example.com").sendResetLink(user, "https://egyetemkapu.hu/uj-jelszo?token=abc");

        verify(mailSender).send(any(MimeMessage.class));
        verify(notificationSenderService).sendTelegramMessage(eq("12345"), contains("https://egyetemkapu.hu/uj-jelszo?token=abc"));
    }

    @Test
    void sendResetLink_SkipsEmailWhenHostMissing() {
        User user = new User();
        user.setEmail("diak@egyetemkapu.hu");
        user.setPreferredLanguage("en");
        user.setUsername("diak");

        when(settingsRepository.findByUser(user)).thenReturn(Optional.empty());
        when(environment.acceptsProfiles(any(Profiles.class))).thenReturn(false);

        notifier("").sendResetLink(user, "https://egyetemkapu.hu/uj-jelszo?token=abc");

        verify(mailSender, never()).send(any(MimeMessage.class));
        verify(notificationSenderService, never()).sendTelegramMessage(anyString(), anyString());
    }

    private PasswordResetNotifier notifier(String host) {
        return new PasswordResetNotifier(
                mailSenderProvider,
                notificationSenderService,
                settingsRepository,
                environment,
                host,
                "noreply@egyetemkapu.hu");
    }
}

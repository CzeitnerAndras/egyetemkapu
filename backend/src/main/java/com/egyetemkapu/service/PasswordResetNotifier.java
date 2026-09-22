package com.egyetemkapu.service;

import com.egyetemkapu.model.Settings;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.SettingsRepository;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class PasswordResetNotifier {

    private enum MailKind {
        RESET, VERIFY
    }

    private final ObjectProvider<JavaMailSender> mailSender;
    private final NotificationSenderService notificationSenderService;
    private final SettingsRepository settingsRepository;
    private final Environment environment;
    private final String mailHost;
    private final String mailFrom;

    public PasswordResetNotifier(
            ObjectProvider<JavaMailSender> mailSender,
            NotificationSenderService notificationSenderService,
            SettingsRepository settingsRepository,
            Environment environment,
            @Value("${spring.mail.host:}") String mailHost,
            @Value("${app.mail.from:noreply@egyetemkapu.hu}") String mailFrom) {
        this.mailSender = mailSender;
        this.notificationSenderService = notificationSenderService;
        this.settingsRepository = settingsRepository;
        this.environment = environment;
        this.mailHost = mailHost == null ? "" : mailHost.trim();
        this.mailFrom = mailFrom;
    }

    public void sendResetLink(User user, String resetUrl) {
        send(user, resetUrl, MailKind.RESET);
    }

    public void sendVerificationLink(User user, String verifyUrl) {
        send(user, verifyUrl, MailKind.VERIFY);
    }

    private void send(User user, String url, MailKind kind) {
        boolean english = "en".equalsIgnoreCase(user.getPreferredLanguage());
        sendEmail(user, url, english, kind);
        sendTelegram(user, url, english, kind);
        if (environment.acceptsProfiles(Profiles.of("local"))) {
            String label = kind == MailKind.VERIFY ? "email verification" : "password reset";
            System.out.println("LOCAL " + label + " URL for " + user.getUsername() + ": " + url);
        }
    }

    private void sendEmail(User user, String url, boolean english, MailKind kind) {
        if (mailHost.isBlank()) {
            return;
        }
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            return;
        }
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(user.getEmail());
            helper.setSubject(emailSubject(english, kind));
            helper.setText(emailBody(url, english, kind), false);
            sender.send(message);
        } catch (Exception e) {
            System.out.println("Hiba az e-mail küldésekor: " + e.getMessage());
        }
    }

    private void sendTelegram(User user, String url, boolean english, MailKind kind) {
        settingsRepository.findByUser(user)
                .map(Settings::getTelegramChatId)
                .filter(chatId -> chatId != null && !chatId.isBlank())
                .ifPresent(chatId -> notificationSenderService.sendTelegramMessage(
                        chatId,
                        telegramBody(url, english, kind)));
    }

    private static String emailSubject(boolean english, MailKind kind) {
        if (kind == MailKind.VERIFY) {
            return english ? "Egyetemkapu — confirm your email" : "Egyetemkapu — e-mail megerősítés";
        }
        return english ? "Egyetemkapu — password reset" : "Egyetemkapu — jelszó visszaállítás";
    }

    private static String emailBody(String url, boolean english, MailKind kind) {
        if (kind == MailKind.VERIFY) {
            if (english) {
                return """
                        Confirm your Egyetemkapu account by opening this link within 24 hours:
                        %s

                        If you did not register, you can ignore the email.
                        """.formatted(url);
            }
            return """
                    Erősítsd meg az Egyetemkapu-fiókodat ezen a linken 24 órán belül:
                    %s

                    Ha nem te regisztráltál, hagyd figyelmen kívül ezt a levelet.
                    """.formatted(url);
        }
        if (english) {
            return """
                    Someone requested a password reset for your Egyetemkapu account.

                    Open this link within one hour:
                    %s

                    If you did not ask for this, you can ignore the email.
                    """.formatted(url);
        }
        return """
                Valaki jelszó-visszaállítást kért az Egyetemkapu-fiókodhoz.

                Nyisd meg ezt a linket egy órán belül:
                %s

                Ha nem te kérted, hagyd figyelmen kívül ezt a levelet.
                """.formatted(url);
    }

    private static String telegramBody(String url, boolean english, MailKind kind) {
        if (kind == MailKind.VERIFY) {
            return english
                    ? "Egyetemkapu email confirmation (valid for 24 hours):\n" + url
                    : "Egyetemkapu e-mail megerősítés (24 óráig érvényes):\n" + url;
        }
        if (english) {
            return "Egyetemkapu password reset (valid for 1 hour):\n" + url;
        }
        return "Egyetemkapu jelszó-visszaállítás (1 óráig érvényes):\n" + url;
    }
}

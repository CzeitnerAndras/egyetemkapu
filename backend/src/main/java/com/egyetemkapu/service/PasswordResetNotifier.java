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
        boolean english = "en".equalsIgnoreCase(user.getPreferredLanguage());
        sendEmail(user, resetUrl, english);
        sendTelegram(user, resetUrl, english);
        if (environment.acceptsProfiles(Profiles.of("local"))) {
            System.out.println("LOCAL password reset URL for " + user.getUsername() + ": " + resetUrl);
        }
    }

    private void sendEmail(User user, String resetUrl, boolean english) {
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
            helper.setSubject(english
                    ? "Egyetemkapu — password reset"
                    : "Egyetemkapu — jelszó visszaállítás");
            helper.setText(emailBody(resetUrl, english), false);
            sender.send(message);
        } catch (Exception e) {
            System.out.println("Hiba a jelszó-visszaállító e-mail küldésekor: " + e.getMessage());
        }
    }

    private void sendTelegram(User user, String resetUrl, boolean english) {
        settingsRepository.findByUser(user)
                .map(Settings::getTelegramChatId)
                .filter(chatId -> chatId != null && !chatId.isBlank())
                .ifPresent(chatId -> notificationSenderService.sendTelegramMessage(
                        chatId,
                        telegramBody(resetUrl, english)));
    }

    private static String emailBody(String resetUrl, boolean english) {
        if (english) {
            return """
                    Someone requested a password reset for your Egyetemkapu account.

                    Open this link within one hour:
                    %s

                    If you did not ask for this, you can ignore the email.
                    """.formatted(resetUrl);
        }
        return """
                Valaki jelszó-visszaállítást kért az Egyetemkapu-fiókodhoz.

                Nyisd meg ezt a linket egy órán belül:
                %s

                Ha nem te kérted, hagyd figyelmen kívül ezt a levelet.
                """.formatted(resetUrl);
    }

    private static String telegramBody(String resetUrl, boolean english) {
        if (english) {
            return "Egyetemkapu password reset (valid for 1 hour):\n" + resetUrl;
        }
        return "Egyetemkapu jelszó-visszaállítás (1 óráig érvényes):\n" + resetUrl;
    }
}

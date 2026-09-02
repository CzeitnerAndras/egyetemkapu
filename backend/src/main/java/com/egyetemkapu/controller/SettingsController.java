package com.egyetemkapu.controller;

import com.egyetemkapu.annotation.LogAction;
import com.egyetemkapu.model.Settings;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.SettingsRepository;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.DiscordWebhookValidator;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/settings")
@CrossOrigin
public class SettingsController {

    private final SettingsRepository settingsRepository;
    private final UserRepository userRepository;

    public SettingsController(SettingsRepository settingsRepository, UserRepository userRepository) {
        this.settingsRepository = settingsRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> getSettings(Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();
        
        Optional<User> userOpt = userRepository.findByUsername(principal.getName());
        if (userOpt.isEmpty()) return ResponseEntity.notFound().build();

        Optional<Settings> settingsOpt = settingsRepository.findByUser(userOpt.get());
        if (settingsOpt.isPresent()) {
            return ResponseEntity.ok(settingsOpt.get());
        } else {
            return ResponseEntity.ok(Map.of());
        }
    }

    @PutMapping
    @LogAction("Értesítési beállítások módosítása")
    @Transactional
    public ResponseEntity<?> saveSettings(@RequestBody Map<String, String> payload, Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();

        Optional<User> userOpt = userRepository.findByUsername(principal.getName());
        if (userOpt.isEmpty()) return ResponseEntity.notFound().build();

        User user = userOpt.get();
        Settings settings = settingsRepository.findByUser(user).orElse(new Settings());
        
        String webhook = payload.get("discordWebhook");
        if (!DiscordWebhookValidator.isBlankOrAllowed(webhook)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Csak hivatalos Discord webhook URL menthető (https://discord.com/api/webhooks/...)."));
        }

        settings.setUser(user);
        settings.setDiscordWebhook(webhook == null || webhook.isBlank() ? null : webhook.trim());
        settings.setTelegramChatId(payload.get("telegramChatId"));
        
        settingsRepository.save(settings);
        
        return ResponseEntity.ok(Map.of("message", "Beállítások elmentve!"));
    }
}
package com.egyetemkapu.controller;

import com.egyetemkapu.annotation.LogAction;
import com.egyetemkapu.model.Suggestion;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.SuggestionRepository;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.ClientIpResolver;
import com.egyetemkapu.service.RecaptchaService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/suggestions")
public class SuggestionController {

    private final SuggestionRepository suggestionRepository;
    private final UserRepository userRepository;
    private final RecaptchaService recaptchaService;
    private final ClientIpResolver clientIpResolver;

    public SuggestionController(
            SuggestionRepository suggestionRepository,
            UserRepository userRepository,
            RecaptchaService recaptchaService,
            ClientIpResolver clientIpResolver) {
        this.suggestionRepository = suggestionRepository;
        this.userRepository = userRepository;
        this.recaptchaService = recaptchaService;
        this.clientIpResolver = clientIpResolver;
    }

    @GetMapping("/captcha")
    public Map<String, String> captcha() {
        return Map.of("siteKey", recaptchaService.siteKey());
    }

    // --- List ---
    @GetMapping
    @Transactional(readOnly = true)
    public List<Suggestion> getAllSuggestions() {
        return suggestionRepository.findAll();
    }

    // --- Create ---
    @PostMapping
    @LogAction("Új ötlet/javaslat beküldése az ötletládába")
    @Transactional
    public ResponseEntity<?> createSuggestion(@RequestBody SuggestionRequest request, HttpServletRequest httpRequest) {
        String title = trim(request == null ? null : request.title());
        String description = trim(request == null ? null : request.description());
        if (title == null || title.length() > 100 || description == null || description.length() > 1000) {
            return ResponseEntity.badRequest().body(Map.of("error", "Hiányzó vagy túl hosszú mező."));
        }
        if (!recaptchaService.verify(request.captchaToken(), clientIpResolver.resolve(httpRequest))) {
            return ResponseEntity.badRequest().body(Map.of("error", "captcha"));
        }
        Suggestion suggestion = new Suggestion();
        suggestion.setTitle(title);
        suggestion.setDescription(description);
        suggestion.setUser(currentUser());
        Suggestion saved = suggestionRepository.save(suggestion);
        return ResponseEntity.ok(Map.of("id", saved.getId() == null ? 0 : saved.getId()));
    }

    // --- Delete ---
    @DeleteMapping("/{id}")
    @LogAction("Ötlet/javaslat törlése")
    public void deleteSuggestion(@PathVariable Long id) {
        suggestionRepository.deleteById(id);
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null
                || "anonymousUser".equals(authentication.getName())) {
            return null;
        }
        return userRepository.findByUsername(authentication.getName()).orElse(null);
    }

    private static String trim(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public record SuggestionRequest(String title, String description, String captchaToken) {
    }
}

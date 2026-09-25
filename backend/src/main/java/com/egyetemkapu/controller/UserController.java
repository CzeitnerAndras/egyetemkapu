package com.egyetemkapu.controller;

import com.egyetemkapu.annotation.LogAction;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.AuthCookies;
import com.egyetemkapu.security.JwtUtil;
import com.egyetemkapu.security.PasswordPolicy;
import com.egyetemkapu.security.UsernamePolicy;
import com.egyetemkapu.service.ActiveUserService;
import com.egyetemkapu.service.RefreshTokenService;
import com.egyetemkapu.service.UserAccountService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final UserAccountService userAccountService;
    private final ActiveUserService activeUserService;
    private final RefreshTokenService refreshTokenService;
    private final boolean cookieSecure;

    public UserController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil,
            UserAccountService userAccountService,
            ActiveUserService activeUserService,
            RefreshTokenService refreshTokenService,
            @Value("${app.auth.cookie-secure:false}") boolean cookieSecure) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.userAccountService = userAccountService;
        this.activeUserService = activeUserService;
        this.refreshTokenService = refreshTokenService;
        this.cookieSecure = cookieSecure;
    }

    private Optional<User> getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username);
    }

    @GetMapping("/count")
    public ResponseEntity<?> getActiveUserCount() {
        return ResponseEntity.ok(Map.of("count", activeUserService.countActive()));
    }

    @PostMapping("/heartbeat")
    public ResponseEntity<?> heartbeat(@RequestBody(required = false) Map<String, String> payload) {
        String visitorId = payload == null ? null : payload.get("visitorId");
        activeUserService.heartbeat(visitorId);
        return ResponseEntity.ok(Map.of("count", activeUserService.countActive()));
    }

    @GetMapping("/me")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getUserInfo() {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "Nincs bejelentkezve!"));

        User user = userOpt.get();
        return ResponseEntity.ok(Map.of(
                "username", user.getUsername(),
                "email", user.getEmail(),
                "role", user.getRole(),
                "preferredLanguage", user.getPreferredLanguage() == null ? "hu" : user.getPreferredLanguage()
        ));
    }

    @PutMapping("/me/language")
    @Transactional
    public ResponseEntity<?> updatePreferredLanguage(@RequestBody Map<String, String> request) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "Nincs bejelentkezve!"));

        String language = request.get("language");
        if (!"hu".equals(language) && !"en".equals(language)) {
            return ResponseEntity.badRequest().body(Map.of("error", "A nyelv csak hu vagy en lehet."));
        }

        User user = userOpt.get();
        user.setPreferredLanguage(language);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("preferredLanguage", language));
    }

    @PutMapping("/username")
    @LogAction("Felhasználónév módosítása")
    @Transactional
    public ResponseEntity<?> updateUsername(@RequestBody Map<String, String> request, HttpServletResponse response) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "Nincs bejelentkezve!"));

        String newUsername = trimToNull(request.get("newUsername"));
        if (!UsernamePolicy.isValid(newUsername)) {
            return ResponseEntity.badRequest().body(Map.of("error", UsernamePolicy.UNAVAILABLE_MESSAGE));
        }

        User user = userOpt.get();
        if (newUsername.equals(user.getUsername())) {
            return ResponseEntity.ok(Map.of("message", "Sikeres frissítés!", "username", user.getUsername()));
        }
        if (userRepository.findByUsername(newUsername).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", UsernamePolicy.UNAVAILABLE_MESSAGE));
        }

        user.setUsername(newUsername);
        userRepository.save(user);

        AuthCookies.setAccess(response, jwtUtil.generateToken(newUsername), cookieSecure);
        return ResponseEntity.ok(Map.of("message", "Sikeres frissítés!", "username", newUsername));
    }

    @PutMapping("/password")
    @LogAction("Jelszó módosítása")
    @Transactional
    public ResponseEntity<?> updatePassword(@RequestBody Map<String, String> request, HttpServletResponse response) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "Nincs bejelentkezve!"));

        String currentPassword = request.get("currentPassword");
        String newPassword = request.get("newPassword");
        User user = userOpt.get();

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("error", "A jelenlegi jelszó helytelen!"));
        }

        if (!PasswordPolicy.isValid(newPassword)) {
            return ResponseEntity.badRequest().body(Map.of("error", PasswordPolicy.WEAK_PASSWORD_MESSAGE));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        refreshTokenService.deleteByUserId(user.getId());
        RefreshTokenService.IssuedRefreshToken refresh = refreshTokenService.createRefreshToken(user.getId());
        AuthCookies.setAccess(response, jwtUtil.generateToken(user.getUsername()), cookieSecure);
        AuthCookies.setRefresh(response, refresh.rawToken(), cookieSecure);

        return ResponseEntity.ok(Map.of("message", "Jelszó sikeresen frissítve!"));
    }

    @DeleteMapping("/me")
    @LogAction("Felhasználói fiók törlése")
    @Transactional
    public ResponseEntity<?> deleteAccount(HttpServletResponse response) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "Nincs bejelentkezve!"));

        userAccountService.deleteAccount(userOpt.get());
        AuthCookies.clearSession(response, cookieSecure);
        return ResponseEntity.ok(Map.of("message", "Fiók törölve!"));
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
package com.egyetemkapu.controller;

import com.egyetemkapu.annotation.LogAction;
import com.egyetemkapu.exception.TokenRefreshException;
import com.egyetemkapu.model.RefreshToken;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.AuthCookies;
import com.egyetemkapu.security.JwtUtil;
import com.egyetemkapu.security.PasswordPolicy;
import com.egyetemkapu.service.EmailVerificationService;
import com.egyetemkapu.service.PasswordResetService;
import com.egyetemkapu.service.RefreshTokenService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Pattern USERNAME = Pattern.compile("^[a-zA-Z0-9._-]{3,32}$");
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]{1,64}@[^@\\s]{1,255}$");
    private static final String GENERIC_LOGIN_ERROR = "Hibás e-mail cím vagy jelszó!";
    private static final String GENERIC_REGISTER_ERROR = "A regisztráció nem sikerült.";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RefreshTokenService refreshTokenService;
    private final PasswordResetService passwordResetService;
    private final EmailVerificationService emailVerificationService;
    private final boolean cookieSecure;

    public AuthController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil,
            RefreshTokenService refreshTokenService,
            PasswordResetService passwordResetService,
            EmailVerificationService emailVerificationService,
            @Value("${app.auth.cookie-secure:false}") boolean cookieSecure) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.refreshTokenService = refreshTokenService;
        this.passwordResetService = passwordResetService;
        this.emailVerificationService = emailVerificationService;
        this.cookieSecure = cookieSecure;
    }

    @PostMapping("/register")
    @LogAction("Új felhasználó regisztrációja")
    @Transactional
    public ResponseEntity<?> register(@RequestBody Map<String, String> request) {
        String username = trimToNull(request.get("username"));
        String email = trimToNull(request.get("email"));
        String password = request.get("password");

        if (!PasswordPolicy.isValid(password)) {
            return ResponseEntity.badRequest().body(Map.of("error", PasswordPolicy.WEAK_PASSWORD_MESSAGE));
        }
        if (username == null || email == null || !USERNAME.matcher(username).matches() || !EMAIL.matcher(email).matches()) {
            return ResponseEntity.badRequest().body(Map.of("error", GENERIC_REGISTER_ERROR));
        }
        Optional<User> existingEmail = userRepository.findByEmail(email);
        if (existingEmail.isPresent()) {
            if (!existingEmail.get().isEmailVerified()) {
                emailVerificationService.issueFor(existingEmail.get());
            }
            return ResponseEntity.ok(Map.of("message", EmailVerificationService.ACCEPTED_MESSAGE));
        }
        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.ok(Map.of("message", EmailVerificationService.ACCEPTED_MESSAGE));
        }

        User newUser = new User();
        newUser.setUsername(username);
        newUser.setEmail(email);
        newUser.setPassword(passwordEncoder.encode(password));
        newUser.setEmailVerified(false);
        userRepository.save(newUser);
        emailVerificationService.issueFor(newUser);

        return ResponseEntity.ok(Map.of("message", EmailVerificationService.ACCEPTED_MESSAGE));
    }

    @PostMapping("/login")
    @LogAction("Felhasználó bejelentkezés (Sikeres)")
    @Transactional
    public ResponseEntity<?> login(
            @RequestBody Map<String, String> request,
            HttpServletResponse response) {
        String email = request.get("email");
        String password = request.get("password");
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty() || !passwordEncoder.matches(password, userOpt.get().getPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", GENERIC_LOGIN_ERROR));
        }

        User user = userOpt.get();

        if (!user.isEmailVerified()) {
            return ResponseEntity.status(403).body(Map.of("error", "Erősítsd meg az e-mail címed a belépéshez."));
        }

        RefreshTokenService.IssuedRefreshToken refresh = refreshTokenService.createRefreshToken(user.getId());
        AuthCookies.setAccess(response, jwtUtil.generateToken(user.getUsername()), cookieSecure);
        AuthCookies.setRefresh(response, refresh.rawToken(), cookieSecure);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(HttpServletRequest request, HttpServletResponse response) {
        String rawToken = AuthCookies.readRefresh(request);
        RefreshToken stored = refreshTokenService.findByRawToken(rawToken)
                .map(refreshTokenService::verifyExpiration)
                .orElseThrow(() -> new TokenRefreshException("A Refresh Token érvénytelen az adatbázisban!"));

        RefreshTokenService.IssuedRefreshToken rotated = refreshTokenService.rotate(stored);
        AuthCookies.setAccess(response, jwtUtil.generateToken(stored.getUser().getUsername()), cookieSecure);
        AuthCookies.setRefresh(response, rotated.rawToken(), cookieSecure);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/logout")
    @LogAction("Kijelentkezés")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        String rawToken = AuthCookies.readRefresh(request);
        refreshTokenService.findByRawToken(rawToken).ifPresent(token ->
                refreshTokenService.deleteByUserId(token.getUser().getId())
        );
        AuthCookies.clearSession(response, cookieSecure);
        return ResponseEntity.ok(Map.of("message", "Sikeres kijelentkezés!"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        passwordResetService.requestReset(request.get("email"));
        return ResponseEntity.ok(Map.of("message", PasswordResetService.REQUEST_ACCEPTED_MESSAGE));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        Optional<String> error = passwordResetService.resetPassword(
                request.get("token"),
                request.get("newPassword"));
        if (error.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", error.get()));
        }
        return ResponseEntity.ok(Map.of("message", PasswordResetService.RESET_SUCCESS_MESSAGE));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestBody Map<String, String> request) {
        Optional<String> error = emailVerificationService.verify(request.get("token"));
        if (error.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", error.get()));
        }
        return ResponseEntity.ok(Map.of("message", EmailVerificationService.VERIFIED_MESSAGE));
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

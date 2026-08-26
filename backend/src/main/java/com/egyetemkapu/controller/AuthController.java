package com.egyetemkapu.controller;

import com.egyetemkapu.annotation.LogAction;
import com.egyetemkapu.model.RefreshToken;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.JwtUtil;
import com.egyetemkapu.service.RefreshTokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RefreshTokenService refreshTokenService;
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCKOUT_DURATION_MINUTES = 15;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil, RefreshTokenService refreshTokenService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.refreshTokenService = refreshTokenService;
    }

    @PostMapping("/login")
    @LogAction("Felhasználó bejelentkezés (Sikeres)")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Hibás e-mail cím vagy jelszó!"));
        }

        User user = userOpt.get();

        if (user.getLockoutEndTime() != null) {
            if (user.getLockoutEndTime().isAfter(LocalDateTime.now())) {
                long minutesLeft = ChronoUnit.MINUTES.between(LocalDateTime.now(), user.getLockoutEndTime());
                return ResponseEntity.status(403).body(Map.of("error", "Túl sok hibás próbálkozás! Fiókod zárolva lett. Próbáld újra " + (minutesLeft + 1) + " perc múlva."));
            } else {
                user.setFailedLoginAttempts(0);
                user.setLockoutEndTime(null);
                userRepository.save(user);
            }
        }

        if (passwordEncoder.matches(password, user.getPassword())) {
            if (user.getFailedLoginAttempts() > 0) {
                user.setFailedLoginAttempts(0);
                user.setLockoutEndTime(null);
                userRepository.save(user);
            }
            String accessToken = jwtUtil.generateToken(user.getUsername());
            RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());
            
            return ResponseEntity.ok(Map.of(
                    "token", accessToken,
                    "refreshToken", refreshToken.getToken()
            ));
        } else {
            user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
            if (user.getFailedLoginAttempts() >= MAX_FAILED_ATTEMPTS) {
                user.setLockoutEndTime(LocalDateTime.now().plusMinutes(LOCKOUT_DURATION_MINUTES));
                userRepository.save(user);
                return ResponseEntity.status(403).body(Map.of("error", "Túl sok hibás próbálkozás! Fiókod " + LOCKOUT_DURATION_MINUTES + " percre zárolásra került."));
            }
            userRepository.save(user);
            int remainingAttempts = MAX_FAILED_ATTEMPTS - user.getFailedLoginAttempts();
            return ResponseEntity.status(401).body(Map.of("error", "Hibás e-mail cím vagy jelszó! Hátralévő próbálkozások: " + remainingAttempts));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> request) {
        String requestRefreshToken = request.get("refreshToken");

        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(user -> {
                    String accessToken = jwtUtil.generateToken(user.getUsername());
                    return ResponseEntity.ok(Map.of(
                            "token", accessToken,
                            "refreshToken", requestRefreshToken
                    ));
                })
                .orElseThrow(() -> new RuntimeException("A Refresh Token érvénytelen az adatbázisban!"));
    }

    @PostMapping("/logout")
    @LogAction("Kijelentkezés")
    public ResponseEntity<?> logout(@RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");
        refreshTokenService.findByToken(refreshToken).ifPresent(token -> 
            refreshTokenService.deleteByUserId(token.getUser().getId())
        );
        return ResponseEntity.ok(Map.of("message", "Sikeres kijelentkezés!"));
    }
}
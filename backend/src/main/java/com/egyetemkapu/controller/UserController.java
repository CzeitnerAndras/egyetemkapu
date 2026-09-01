package com.egyetemkapu.controller;

import com.egyetemkapu.annotation.LogAction;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    private Optional<User> getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username);
    }

    @GetMapping("/count")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getUserCount() {
        long count = userRepository.count();
        return ResponseEntity.ok(Map.of("count", count));
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
    public ResponseEntity<?> updateUsername(@RequestBody Map<String, String> request) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "Nincs bejelentkezve!"));

        String newUsername = request.get("newUsername");
        
        if (userRepository.findByUsername(newUsername).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ez a felhasználónév már foglalt!"));
        }

        User user = userOpt.get();
        user.setUsername(newUsername);
        userRepository.save(user);

        String newToken = jwtUtil.generateToken(newUsername);
        return ResponseEntity.ok(Map.of("message", "Sikeres frissítés!", "token", newToken));
    }

    @PutMapping("/password")
    @LogAction("Jelszó módosítása")
    @Transactional
    public ResponseEntity<?> updatePassword(@RequestBody Map<String, String> request) {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "Nincs bejelentkezve!"));

        String currentPassword = request.get("currentPassword");
        String newPassword = request.get("newPassword");
        User user = userOpt.get();

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("error", "A jelenlegi jelszó helytelen!"));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Jelszó sikeresen frissítve!"));
    }

    @DeleteMapping("/me")
    @LogAction("Felhasználói fiók törlése")
    @Transactional
    public ResponseEntity<?> deleteAccount() {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "Nincs bejelentkezve!"));

        userRepository.delete(userOpt.get());
        return ResponseEntity.ok(Map.of("message", "Fiók törölve!"));
    }
}
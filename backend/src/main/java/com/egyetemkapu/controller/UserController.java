package com.egyetemkapu.controller;

import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
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

    @GetMapping("/me")
    public ResponseEntity<?> getUserInfo() {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "Nincs bejelentkezve!"));

        User user = userOpt.get();
        return ResponseEntity.ok(Map.of(
                "username", user.getUsername(),
                "email", user.getEmail(),
                "role", user.getRole()
        ));
    }

    @PutMapping("/username")
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
    public ResponseEntity<?> deleteAccount() {
        Optional<User> userOpt = getCurrentUser();
        if (userOpt.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "Nincs bejelentkezve!"));

        userRepository.delete(userOpt.get());
        return ResponseEntity.ok(Map.of("message", "Fiók törölve!"));
    }
}
package com.egyetemkapu.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @JsonIgnore
    @Column(nullable = false, unique = true)
    private String email;

    @JsonIgnore
    @Column(nullable = false)
    private String password;

    @JsonIgnore
    @Column(nullable = false)
    private String role = "ROLE_USER";

    @JsonIgnore
    @Column(name = "failed_login_attempts", nullable = false)
    private int failedLoginAttempts = 0;

    @JsonIgnore
    @Column(name = "lockout_end_time")
    private LocalDateTime lockoutEndTime;

    @JsonIgnore
    @Column(name = "preferred_language", nullable = false, length = 8)
    private String preferredLanguage = "hu";
}
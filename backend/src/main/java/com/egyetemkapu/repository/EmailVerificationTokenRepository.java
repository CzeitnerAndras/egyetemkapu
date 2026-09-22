package com.egyetemkapu.repository;

import com.egyetemkapu.model.EmailVerificationToken;
import com.egyetemkapu.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {
    Optional<EmailVerificationToken> findByTokenHash(String tokenHash);
    Optional<EmailVerificationToken> findByUser(User user);
    void deleteByUser(User user);
}

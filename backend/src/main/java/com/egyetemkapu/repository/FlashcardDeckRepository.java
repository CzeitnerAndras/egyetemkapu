package com.egyetemkapu.repository;

import com.egyetemkapu.model.FlashcardDeck;
import com.egyetemkapu.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FlashcardDeckRepository extends JpaRepository<FlashcardDeck, Long> {
    List<FlashcardDeck> findAllByUserOrderByNameAsc(User user);

    Optional<FlashcardDeck> findByIdAndUser(Long id, User user);

    long countByUser(User user);

    void deleteByUser(User user);
}

package com.egyetemkapu.repository;

import com.egyetemkapu.model.Flashcard;
import com.egyetemkapu.model.FlashcardDeck;
import com.egyetemkapu.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface FlashcardRepository extends JpaRepository<Flashcard, Long> {
    List<Flashcard> findAllByDeckOrderByCreatedAtAsc(FlashcardDeck deck);

    List<Flashcard> findByDeck_UserAndDueAtLessThanEqualOrderByDueAtAsc(User user, LocalDateTime dueAt);

    List<Flashcard> findByDeckAndDueAtLessThanEqualOrderByDueAtAsc(FlashcardDeck deck, LocalDateTime dueAt);

    Optional<Flashcard> findByIdAndDeck_User(Long id, User user);

    long countByDeck(FlashcardDeck deck);

    long countByDeckAndDueAtLessThanEqual(FlashcardDeck deck, LocalDateTime dueAt);

    void deleteByDeck_User(User user);
}

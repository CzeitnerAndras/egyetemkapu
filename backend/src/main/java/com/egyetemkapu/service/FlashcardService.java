package com.egyetemkapu.service;

import com.egyetemkapu.dto.FlashcardDeckDto;
import com.egyetemkapu.dto.FlashcardDto;
import com.egyetemkapu.exception.FlashcardAccessException;
import com.egyetemkapu.model.Flashcard;
import com.egyetemkapu.model.FlashcardDeck;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.FlashcardDeckRepository;
import com.egyetemkapu.repository.FlashcardRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class FlashcardService {

    public static final int MAX_DECKS = 40;
    public static final int MAX_CARDS = 200;
    public static final int MAX_NAME_LENGTH = 80;
    public static final int MAX_SIDE_LENGTH = 1000;

    private final FlashcardDeckRepository deckRepository;
    private final FlashcardRepository cardRepository;
    private final Clock clock;

    public FlashcardService(
            FlashcardDeckRepository deckRepository,
            FlashcardRepository cardRepository,
            Clock clock) {
        this.deckRepository = deckRepository;
        this.cardRepository = cardRepository;
        this.clock = clock;
    }

    // --- Decks ---
    @Transactional(readOnly = true)
    public List<FlashcardDeckDto> listDecks(User user) {
        LocalDateTime now = now();
        return deckRepository.findAllByUserOrderByNameAsc(user).stream()
                .map(deck -> toDeckDto(deck, now))
                .toList();
    }

    public FlashcardDeckDto createDeck(User user, String name) {
        if (deckRepository.countByUser(user) >= MAX_DECKS) {
            throw new IllegalArgumentException("Legfeljebb " + MAX_DECKS + " pakli lehet.");
        }
        FlashcardDeck deck = new FlashcardDeck();
        deck.setName(clean(name, MAX_NAME_LENGTH, "A pakli neve kötelező.", "A pakli neve legfeljebb 80 karakter lehet."));
        deck.setUser(user);
        return toDeckDto(deckRepository.save(deck), now());
    }

    public FlashcardDeckDto renameDeck(User user, Long deckId, String name) {
        FlashcardDeck deck = requireDeck(user, deckId);
        deck.setName(clean(name, MAX_NAME_LENGTH, "A pakli neve kötelező.", "A pakli neve legfeljebb 80 karakter lehet."));
        return toDeckDto(deckRepository.save(deck), now());
    }

    public void deleteDeck(User user, Long deckId) {
        deckRepository.delete(requireDeck(user, deckId));
    }

    @Transactional(readOnly = true)
    // --- Cards ---
    public List<FlashcardDto> listCards(User user, Long deckId) {
        FlashcardDeck deck = requireDeck(user, deckId);
        return cardRepository.findAllByDeckOrderByCreatedAtAsc(deck).stream()
                .map(this::toCardDto)
                .toList();
    }

    public FlashcardDto createCard(User user, Long deckId, String front, String back) {
        FlashcardDeck deck = requireDeck(user, deckId);
        if (cardRepository.countByDeck(deck) >= MAX_CARDS) {
            throw new IllegalArgumentException("Egy pakliban legfeljebb " + MAX_CARDS + " kártya lehet.");
        }
        Flashcard card = new Flashcard();
        card.setDeck(deck);
        card.setFront(cleanSide(front, "A kérdés kötelező.", "A kérdés legfeljebb 1000 karakter lehet."));
        card.setBack(cleanSide(back, "A válasz kötelező.", "A válasz legfeljebb 1000 karakter lehet."));
        card.setIntervalDays(0);
        card.setDueAt(now());
        return toCardDto(cardRepository.save(card));
    }

    public FlashcardDto updateCard(User user, Long cardId, String front, String back) {
        Flashcard card = requireCard(user, cardId);
        card.setFront(cleanSide(front, "A kérdés kötelező.", "A kérdés legfeljebb 1000 karakter lehet."));
        card.setBack(cleanSide(back, "A válasz kötelező.", "A válasz legfeljebb 1000 karakter lehet."));
        return toCardDto(cardRepository.save(card));
    }

    public void deleteCard(User user, Long cardId) {
        cardRepository.delete(requireCard(user, cardId));
    }

    @Transactional(readOnly = true)
    // --- Review ---
    public List<FlashcardDto> dueCards(User user, Long deckId) {
        LocalDateTime now = now();
        List<Flashcard> cards = deckId == null
                ? cardRepository.findByDeck_UserAndDueAtLessThanEqualOrderByDueAtAsc(user, now)
                : cardRepository.findByDeckAndDueAtLessThanEqualOrderByDueAtAsc(requireDeck(user, deckId), now);
        return cards.stream().map(this::toCardDto).toList();
    }

    public FlashcardDto review(User user, Long cardId, String rating) {
        Flashcard card = requireCard(user, cardId);
        FlashcardScheduler.NextReview next = FlashcardScheduler.schedule(card.getIntervalDays(), rating, now());
        card.setIntervalDays(next.intervalDays());
        card.setDueAt(next.dueAt());
        return toCardDto(cardRepository.save(card));
    }

    private FlashcardDeck requireDeck(User user, Long deckId) {
        if (deckId == null) {
            throw new FlashcardAccessException();
        }
        return deckRepository.findByIdAndUser(deckId, user).orElseThrow(FlashcardAccessException::new);
    }

    private Flashcard requireCard(User user, Long cardId) {
        if (cardId == null) {
            throw new FlashcardAccessException();
        }
        return cardRepository.findByIdAndDeck_User(cardId, user).orElseThrow(FlashcardAccessException::new);
    }

    private FlashcardDeckDto toDeckDto(FlashcardDeck deck, LocalDateTime now) {
        return new FlashcardDeckDto(
                deck.getId(),
                deck.getName(),
                cardRepository.countByDeck(deck),
                cardRepository.countByDeckAndDueAtLessThanEqual(deck, now));
    }

    private FlashcardDto toCardDto(Flashcard card) {
        FlashcardDeck deck = card.getDeck();
        return new FlashcardDto(
                card.getId(),
                deck.getId(),
                deck.getName(),
                card.getFront(),
                card.getBack(),
                card.getIntervalDays(),
                card.getDueAt());
    }

    private LocalDateTime now() {
        return LocalDateTime.now(clock);
    }

    private static String cleanSide(String value, String emptyMessage, String longMessage) {
        return clean(value, MAX_SIDE_LENGTH, emptyMessage, longMessage);
    }

    private static String clean(String value, int maxLength, String emptyMessage, String longMessage) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(emptyMessage);
        }
        String trimmed = value.trim();
        if (trimmed.length() > maxLength) {
            throw new IllegalArgumentException(longMessage);
        }
        return trimmed;
    }
}

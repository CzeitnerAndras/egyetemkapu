package com.egyetemkapu.service;

import com.egyetemkapu.config.TimeConfig;
import com.egyetemkapu.dto.FlashcardDto;
import com.egyetemkapu.exception.FlashcardAccessException;
import com.egyetemkapu.model.Flashcard;
import com.egyetemkapu.model.FlashcardDeck;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.FlashcardDeckRepository;
import com.egyetemkapu.repository.FlashcardRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FlashcardServiceTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 9, 29, 12, 0);

    @Mock
    private FlashcardDeckRepository deckRepository;

    @Mock
    private FlashcardRepository cardRepository;

    private FlashcardService flashcardService;
    private User user;
    private FlashcardDeck deck;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-09-29T10:00:00Z"), TimeConfig.APP_ZONE);
        flashcardService = new FlashcardService(deckRepository, cardRepository, clock);
        user = new User();
        user.setId(1L);
        deck = new FlashcardDeck();
        deck.setId(3L);
        deck.setName("Analízis");
        deck.setUser(user);
    }

    @Test
    void createCardIsDueImmediately() {
        when(deckRepository.findByIdAndUser(3L, user)).thenReturn(Optional.of(deck));
        when(cardRepository.countByDeck(deck)).thenReturn(0L);
        when(cardRepository.save(any(Flashcard.class))).thenAnswer(invocation -> {
            Flashcard saved = invocation.getArgument(0);
            saved.setId(9L);
            return saved;
        });

        FlashcardDto created = flashcardService.createCard(user, 3L, "  Mi a derivált?  ", " 2x ");

        assertEquals("Mi a derivált?", created.front());
        assertEquals("2x", created.back());
        assertEquals(0, created.intervalDays());
        assertEquals(NOW, created.dueAt());
        assertEquals(3L, created.deckId());
    }

    @Test
    void createCardRejectsAFullDeck() {
        when(deckRepository.findByIdAndUser(3L, user)).thenReturn(Optional.of(deck));
        when(cardRepository.countByDeck(deck)).thenReturn((long) FlashcardService.MAX_CARDS);

        assertThrows(IllegalArgumentException.class, () -> flashcardService.createCard(user, 3L, "kérdés", "válasz"));
    }

    @Test
    void reviewGoodMovesTheCardToTomorrow() {
        Flashcard card = card(0);
        when(cardRepository.findByIdAndDeck_User(5L, user)).thenReturn(Optional.of(card));
        when(cardRepository.save(any(Flashcard.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FlashcardDto reviewed = flashcardService.review(user, 5L, "good");

        assertEquals(1, reviewed.intervalDays());
        assertEquals(NOW.plusDays(1), reviewed.dueAt());
    }

    @Test
    void reviewDoesNotTouchAnotherUsersCard() {
        when(cardRepository.findByIdAndDeck_User(5L, user)).thenReturn(Optional.empty());

        assertThrows(FlashcardAccessException.class, () -> flashcardService.review(user, 5L, "again"));
    }

    @Test
    void createDeckTrimsTheName() {
        when(deckRepository.countByUser(user)).thenReturn(0L);
        when(deckRepository.save(any(FlashcardDeck.class))).thenAnswer(invocation -> {
            FlashcardDeck saved = invocation.getArgument(0);
            saved.setId(8L);
            return saved;
        });
        when(cardRepository.countByDeck(any(FlashcardDeck.class))).thenReturn(0L);

        var created = flashcardService.createDeck(user, "  Operációkutatás  ");

        ArgumentCaptor<FlashcardDeck> captor = ArgumentCaptor.forClass(FlashcardDeck.class);
        verify(deckRepository).save(captor.capture());
        assertEquals("Operációkutatás", captor.getValue().getName());
        assertEquals(user, captor.getValue().getUser());
        assertEquals(8L, created.id());
    }

    private Flashcard card(int intervalDays) {
        Flashcard card = new Flashcard();
        card.setId(5L);
        card.setDeck(deck);
        card.setFront("kérdés");
        card.setBack("válasz");
        card.setIntervalDays(intervalDays);
        card.setDueAt(NOW);
        return card;
    }
}

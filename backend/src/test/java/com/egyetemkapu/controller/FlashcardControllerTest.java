package com.egyetemkapu.controller;

import com.egyetemkapu.dto.FlashcardDeckDto;
import com.egyetemkapu.dto.FlashcardDto;
import com.egyetemkapu.exception.FlashcardAccessException;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.ClientIpResolver;
import com.egyetemkapu.security.JwtUtil;
import com.egyetemkapu.service.FlashcardService;
import com.egyetemkapu.service.RateLimitingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FlashcardController.class)
class FlashcardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FlashcardService flashcardService;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private RateLimitingService rateLimitingService;

    @MockitoBean
    private ClientIpResolver clientIpResolver;

    @Test
    void listDecksWithoutAUserReturns401() throws Exception {
        mockMvc.perform(get("/api/flashcards/decks"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void reviewReturnsTheUpdatedCard() throws Exception {
        User user = new User();
        user.setId(1L);
        user.setUsername("teszt_hallgato");
        when(userRepository.findByUsername("teszt_hallgato")).thenReturn(Optional.of(user));
        when(flashcardService.review(user, 5L, "good")).thenReturn(new FlashcardDto(
                5L,
                3L,
                "Analízis",
                "Mi a derivált?",
                "2x",
                1,
                LocalDateTime.of(2026, 9, 30, 12, 0)));

        mockMvc.perform(post("/api/flashcards/cards/5/review")
                        .with(user("teszt_hallgato"))
                        .principal(() -> "teszt_hallgato")
                        .header("Origin", "https://egyetemkapu.hu")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":\"good\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.intervalDays").value(1))
                .andExpect(jsonPath("$.deckName").value("Analízis"));
    }

    @Test
    void reviewOfAMissingCardReturns404() throws Exception {
        User user = new User();
        user.setId(1L);
        user.setUsername("teszt_hallgato");
        when(userRepository.findByUsername("teszt_hallgato")).thenReturn(Optional.of(user));
        when(flashcardService.review(user, 5L, "again")).thenThrow(new FlashcardAccessException());

        mockMvc.perform(post("/api/flashcards/cards/5/review")
                        .with(user("teszt_hallgato"))
                        .principal(() -> "teszt_hallgato")
                        .header("Origin", "https://egyetemkapu.hu")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":\"again\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("A kártya vagy a pakli nem található."));
    }

    @Test
    void createDeckReturnsTheSavedDeck() throws Exception {
        User user = signedIn();
        when(flashcardService.createDeck(user, "Analízis")).thenReturn(
                new FlashcardDeckDto(8L, "Analízis", 0, 0));

        mockMvc.perform(post("/api/flashcards/decks")
                        .with(user("teszt_hallgato"))
                        .principal(() -> "teszt_hallgato")
                        .header("Origin", "https://egyetemkapu.hu")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Analízis\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(8))
                .andExpect(jsonPath("$.name").value("Analízis"));
    }

    @Test
    void dueCardsForwardsTheDeckId() throws Exception {
        User user = signedIn();
        when(flashcardService.dueCards(user, 3L)).thenReturn(List.of(new FlashcardDto(
                5L, 3L, "Analízis", "Mi a derivált?", "2x", 0, LocalDateTime.of(2026, 9, 30, 12, 0))));

        mockMvc.perform(get("/api/flashcards/due")
                        .param("deckId", "3")
                        .with(user("teszt_hallgato"))
                        .principal(() -> "teszt_hallgato"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].front").value("Mi a derivált?"));
    }

    @Test
    void anUnknownAccountReturns401() throws Exception {
        when(userRepository.findByUsername("nincs")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/flashcards/decks")
                        .with(user("nincs"))
                        .principal(() -> "nincs"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void renameDeckReturnsTheUpdatedDeck() throws Exception {
        User user = signedIn();
        when(flashcardService.renameDeck(user, 3L, "Új név")).thenReturn(new FlashcardDeckDto(3L, "Új név", 2, 1));

        mockMvc.perform(put("/api/flashcards/decks/3")
                        .with(user("teszt_hallgato"))
                        .principal(() -> "teszt_hallgato")
                        .header("Origin", "https://egyetemkapu.hu")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Új név\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Új név"));
    }

    @Test
    void deleteDeckRemovesTheDeck() throws Exception {
        User user = signedIn();

        mockMvc.perform(delete("/api/flashcards/decks/3")
                        .with(user("teszt_hallgato"))
                        .principal(() -> "teszt_hallgato")
                        .header("Origin", "https://egyetemkapu.hu"))
                .andExpect(status().isOk());

        verify(flashcardService).deleteDeck(user, 3L);
    }

    @Test
    void listCardsReturnsTheDeck() throws Exception {
        User user = signedIn();
        when(flashcardService.listCards(user, 3L)).thenReturn(List.of(card()));

        mockMvc.perform(get("/api/flashcards/decks/3/cards")
                        .with(user("teszt_hallgato"))
                        .principal(() -> "teszt_hallgato"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].front").value("kérdés"));
    }

    @Test
    void createCardReturnsTheSavedCard() throws Exception {
        User user = signedIn();
        when(flashcardService.createCard(user, 3L, "kérdés", "válasz")).thenReturn(card());

        mockMvc.perform(post("/api/flashcards/decks/3/cards")
                        .with(user("teszt_hallgato"))
                        .principal(() -> "teszt_hallgato")
                        .header("Origin", "https://egyetemkapu.hu")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"front\":\"kérdés\",\"back\":\"válasz\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.back").value("válasz"));
    }

    @Test
    void updateCardReturnsTheEditedCard() throws Exception {
        User user = signedIn();
        when(flashcardService.updateCard(user, 5L, "új kérdés", "új válasz")).thenReturn(card());

        mockMvc.perform(put("/api/flashcards/cards/5")
                        .with(user("teszt_hallgato"))
                        .principal(() -> "teszt_hallgato")
                        .header("Origin", "https://egyetemkapu.hu")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"front\":\"új kérdés\",\"back\":\"új válasz\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(5));
    }

    @Test
    void deleteCardRemovesTheCard() throws Exception {
        User user = signedIn();

        mockMvc.perform(delete("/api/flashcards/cards/5")
                        .with(user("teszt_hallgato"))
                        .principal(() -> "teszt_hallgato")
                        .header("Origin", "https://egyetemkapu.hu"))
                .andExpect(status().isOk());

        verify(flashcardService).deleteCard(user, 5L);
    }

    private static FlashcardDto card() {
        return new FlashcardDto(5L, 3L, "Analízis", "kérdés", "válasz", 0, LocalDateTime.of(2026, 9, 30, 12, 0));
    }

    private User signedIn() {
        User user = new User();
        user.setId(1L);
        user.setUsername("teszt_hallgato");
        when(userRepository.findByUsername("teszt_hallgato")).thenReturn(Optional.of(user));
        return user;
    }
}

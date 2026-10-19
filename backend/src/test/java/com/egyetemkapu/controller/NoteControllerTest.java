package com.egyetemkapu.controller;

import com.egyetemkapu.model.Note;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.NoteRepository;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.ClientIpResolver;
import com.egyetemkapu.security.JwtUtil;
import com.egyetemkapu.service.RateLimitingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(NoteController.class)
@AutoConfigureMockMvc(addFilters = false)
class NoteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private NoteRepository noteRepository;
    @MockitoBean
    private UserRepository userRepository;
    @MockitoBean
    private JwtUtil jwtUtil;
    @MockitoBean
    private RateLimitingService rateLimitingService;
    @MockitoBean
    private ClientIpResolver clientIpResolver;

    @Test
    void getAllNotes_withoutASessionReturns401() throws Exception {
        mockMvc.perform(get("/api/notes"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getAllNotes_returnsOnlyTheSignedInUsersNotes() throws Exception {
        User anna = user(1L, "anna");
        when(userRepository.findByUsername("anna")).thenReturn(Optional.of(anna));
        Note note = new Note();
        note.setContent("Emlékeztető");
        when(noteRepository.findAllByUserOrderByCreatedAtDesc(anna)).thenReturn(List.of(note));

        mockMvc.perform(get("/api/notes").principal(() -> "anna"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").value("Emlékeztető"));
    }

    @Test
    void createNote_ignoresAClientSuppliedIdAndAssignsTheUser() throws Exception {
        User anna = user(1L, "anna");
        when(userRepository.findByUsername("anna")).thenReturn(Optional.of(anna));
        when(noteRepository.save(any(Note.class))).thenAnswer(invocation -> {
            Note note = invocation.getArgument(0);
            assertNull(note.getId());
            assertEquals(anna, note.getUser());
            assertEquals("Emlékeztető", note.getContent());
            note.setId(8L);
            return note;
        });

        mockMvc.perform(post("/api/notes")
                        .principal(() -> "anna")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":99,\"content\":\"Emlékeztető\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(8));
    }

    @Test
    void updateNote_changesContentTheUserOwns() throws Exception {
        User anna = user(1L, "anna");
        when(userRepository.findByUsername("anna")).thenReturn(Optional.of(anna));
        Note note = owned(3L, anna, "régi");
        when(noteRepository.findById(3L)).thenReturn(Optional.of(note));
        when(noteRepository.save(any(Note.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(put("/api/notes/3")
                        .principal(() -> "anna")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"új\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("új"));
    }

    @Test
    void updateNote_hidesAnotherUsersNote() throws Exception {
        User anna = user(1L, "anna");
        User bela = user(2L, "bela");
        when(userRepository.findByUsername("bela")).thenReturn(Optional.of(bela));
        when(noteRepository.findById(3L)).thenReturn(Optional.of(owned(3L, anna, "titok")));

        mockMvc.perform(put("/api/notes/3")
                        .principal(() -> "bela")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"új\"}"))
                .andExpect(status().isNotFound());

        verify(noteRepository, never()).save(any());
    }

    @Test
    void deleteNote_removesANoteTheUserOwns() throws Exception {
        User anna = user(1L, "anna");
        when(userRepository.findByUsername("anna")).thenReturn(Optional.of(anna));
        Note note = owned(3L, anna, "törlendő");
        when(noteRepository.findById(3L)).thenReturn(Optional.of(note));

        mockMvc.perform(delete("/api/notes/3").principal(() -> "anna"))
                .andExpect(status().isOk());

        verify(noteRepository).delete(note);
    }

    @Test
    void deleteNote_missingNoteReturns404() throws Exception {
        User anna = user(1L, "anna");
        when(userRepository.findByUsername("anna")).thenReturn(Optional.of(anna));
        when(noteRepository.findById(3L)).thenReturn(Optional.empty());

        mockMvc.perform(delete("/api/notes/3").principal(() -> "anna"))
                .andExpect(status().isNotFound());

        verify(noteRepository, never()).delete(any());
    }

    private static User user(long id, String username) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        return user;
    }

    private static Note owned(long id, User owner, String content) {
        Note note = new Note();
        note.setId(id);
        note.setUser(owner);
        note.setContent(content);
        return note;
    }
}

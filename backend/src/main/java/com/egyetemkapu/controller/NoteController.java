package com.egyetemkapu.controller;

import com.egyetemkapu.annotation.LogAction;
import com.egyetemkapu.model.Note;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.NoteRepository;
import com.egyetemkapu.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/notes")
@CrossOrigin
public class NoteController {

    private final NoteRepository noteRepository;
    private final UserRepository userRepository;

    public NoteController(NoteRepository noteRepository, UserRepository userRepository) {
        this.noteRepository = noteRepository;
        this.userRepository = userRepository;
    }

    private Optional<User> resolveUser(Principal principal) {
        if (principal == null) return Optional.empty();
        return userRepository.findByUsername(principal.getName());
    }

    private boolean ownsNote(Note note, User user) {
        return note.getUser() != null && user.getId() != null && user.getId().equals(note.getUser().getId());
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<Note>> getAllNotes(Principal principal) {
        Optional<User> userOpt = resolveUser(principal);
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(noteRepository.findAllByUserOrderByCreatedAtDesc(userOpt.get()));
    }

    @PostMapping
    @LogAction("Új jegyzet létrehozása")
    @Transactional
    public ResponseEntity<Note> createNote(@RequestBody Note note, Principal principal) {
        Optional<User> userOpt = resolveUser(principal);
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();

        note.setUser(userOpt.get());
        return ResponseEntity.ok(noteRepository.save(note));
    }

    @PutMapping("/{id}")
    @LogAction("Jegyzet módosítása")
    @Transactional
    public ResponseEntity<Note> updateNote(@PathVariable Long id, @RequestBody Note updatedNote, Principal principal) {
        Optional<User> userOpt = resolveUser(principal);
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();

        return noteRepository.findById(id)
                .filter(note -> ownsNote(note, userOpt.get()))
                .map(note -> {
                    note.setContent(updatedNote.getContent());
                    return ResponseEntity.ok(noteRepository.save(note));
                })
                .orElse(ResponseEntity.status(404).build());
    }

    @DeleteMapping("/{id}")
    @LogAction("Jegyzet törlése")
    @Transactional
    public ResponseEntity<?> deleteNote(@PathVariable Long id, Principal principal) {
        Optional<User> userOpt = resolveUser(principal);
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();

        return noteRepository.findById(id)
                .filter(note -> ownsNote(note, userOpt.get()))
                .map(note -> {
                    noteRepository.delete(note);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.status(404).build());
    }
}

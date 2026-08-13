package com.egyetemkapu.controller;

import com.egyetemkapu.model.Note;
import com.egyetemkapu.repository.NoteRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notes")
@CrossOrigin
public class NoteController {

    private final NoteRepository noteRepository;

    public NoteController(NoteRepository noteRepository) {
        this.noteRepository = noteRepository;
    }

    @GetMapping
    public List<Note> getAllNotes() {
        return noteRepository.findAll();
    }

    @PostMapping
    public Note createNote(@RequestBody Note note) {
        return noteRepository.save(note);
    }

    @PutMapping("/{id}")
    public Note updateNote(@PathVariable Long id, @RequestBody Note updatedNote) {
        return noteRepository.findById(id)
                .map(note -> {
                    note.setContent(updatedNote.getContent());
                    return noteRepository.save(note);
                })
                .orElseThrow(() -> new RuntimeException("A jegyzet nem található ezzel az ID-val: " + id));
    }

    @DeleteMapping("/{id}")
    public void deleteNote(@PathVariable Long id) {
        noteRepository.deleteById(id);
    }
}
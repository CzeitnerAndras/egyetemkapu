package com.egyetemkapu.controller;

import com.egyetemkapu.annotation.LogAction;
import com.egyetemkapu.model.Note;
import com.egyetemkapu.repository.NoteRepository;
import org.springframework.transaction.annotation.Transactional;
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
    @Transactional(readOnly = true)
    public List<Note> getAllNotes() {
        return noteRepository.findAll();
    }

    @PostMapping
    @LogAction("Új jegyzet létrehozása")
    public Note createNote(@RequestBody Note note) {
        return noteRepository.save(note);
    }

    @PutMapping("/{id}")
    @LogAction("Jegyzet módosítása")
    @Transactional
    public Note updateNote(@PathVariable Long id, @RequestBody Note updatedNote) {
        return noteRepository.findById(id)
                .map(note -> {
                    note.setContent(updatedNote.getContent());
                    return noteRepository.save(note);
                })
                .orElseThrow(() -> new RuntimeException("A jegyzet nem található ezzel az ID-val: " + id));
    }

    @DeleteMapping("/{id}")
    @LogAction("Jegyzet törlése")
    public void deleteNote(@PathVariable Long id) {
        noteRepository.deleteById(id);
    }
}
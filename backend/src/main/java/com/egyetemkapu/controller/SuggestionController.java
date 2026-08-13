package com.egyetemkapu.controller;

import com.egyetemkapu.model.Suggestion;
import com.egyetemkapu.repository.SuggestionRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suggestions")
@CrossOrigin
public class SuggestionController {

    private final SuggestionRepository suggestionRepository;

    public SuggestionController(SuggestionRepository suggestionRepository) {
        this.suggestionRepository = suggestionRepository;
    }

    @GetMapping
    public List<Suggestion> getAllSuggestions() {
        return suggestionRepository.findAll();
    }

    @PostMapping
    public Suggestion createSuggestion(@RequestBody Suggestion suggestion) {
        return suggestionRepository.save(suggestion);
    }

    @DeleteMapping("/{id}")
    public void deleteSuggestion(@PathVariable Long id) {
        suggestionRepository.deleteById(id);
    }
}
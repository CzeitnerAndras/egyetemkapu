package com.egyetemkapu.controller;

import com.egyetemkapu.model.Suggestion;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.SuggestionRepository;
import com.egyetemkapu.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suggestions")
@CrossOrigin
public class SuggestionController {

    private final SuggestionRepository suggestionRepository;
    private final UserRepository userRepository;

    public SuggestionController(SuggestionRepository suggestionRepository, UserRepository userRepository) {
        this.suggestionRepository = suggestionRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<Suggestion> getAllSuggestions() {
        return suggestionRepository.findAll();
    }

    @PostMapping
    public Suggestion createSuggestion(@RequestBody Suggestion suggestion) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentPrincipalName = authentication.getName();
        User currentUser = userRepository.findByEmail(currentPrincipalName)
                .orElseGet(() -> userRepository.findByUsername(currentPrincipalName)
                .orElseThrow(() -> new RuntimeException("Felhasználó nem található!")));
        suggestion.setUser(currentUser);
        return suggestionRepository.save(suggestion);
    }

    @DeleteMapping("/{id}")
    public void deleteSuggestion(@PathVariable Long id) {
        suggestionRepository.deleteById(id);
    }
}
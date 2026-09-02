package com.egyetemkapu.controller;

import com.egyetemkapu.annotation.LogAction;
import com.egyetemkapu.model.Subject;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.SubjectRepository;
import com.egyetemkapu.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/subjects")
@CrossOrigin
public class SubjectController {

    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;

    public SubjectController(SubjectRepository subjectRepository, UserRepository userRepository) {
        this.subjectRepository = subjectRepository;
        this.userRepository = userRepository;
    }

    private Optional<User> resolveUser(Principal principal) {
        if (principal == null) return Optional.empty();
        return userRepository.findByUsername(principal.getName());
    }

    @PostMapping
    @LogAction("Új tantárgy rögzítése")
    @Transactional
    public ResponseEntity<Subject> createSubject(@RequestBody Subject subject, Principal principal) {
        Optional<User> userOpt = resolveUser(principal);
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();

        subject.setId(null);
        subject.setUser(userOpt.get());
        return ResponseEntity.ok(subjectRepository.save(subject));
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<Subject>> getAllSubjects(Principal principal) {
        Optional<User> userOpt = resolveUser(principal);
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();

        return ResponseEntity.ok(subjectRepository.findAllByUser(userOpt.get()));
    }
}

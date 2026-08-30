package com.egyetemkapu.controller;

import com.egyetemkapu.annotation.LogAction;
import com.egyetemkapu.model.Grade;
import com.egyetemkapu.model.Subject;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.GradeRepository;
import com.egyetemkapu.repository.SubjectRepository;
import com.egyetemkapu.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/grades")
@CrossOrigin
public class GradeController {

    private final GradeRepository gradeRepository;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;

    public GradeController(GradeRepository gradeRepository, SubjectRepository subjectRepository, UserRepository userRepository) {
        this.gradeRepository = gradeRepository;
        this.subjectRepository = subjectRepository;
        this.userRepository = userRepository;
    }

    private Optional<User> resolveUser(Principal principal) {
        if (principal == null) return Optional.empty();
        return userRepository.findByUsername(principal.getName());
    }

    private boolean ownsSubject(Subject subject, User user) {
        return subject.getUser() != null && user.getId() != null && user.getId().equals(subject.getUser().getId());
    }

    @PostMapping("/{subjectId}")
    @LogAction("Új érdemjegy rögzítése")
    @Transactional
    public ResponseEntity<Grade> addGrade(@PathVariable Long subjectId, @RequestBody Grade gradeRequest, Principal principal) {
        Optional<User> userOpt = resolveUser(principal);
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();

        Optional<Subject> subjectOpt = subjectRepository.findById(subjectId);
        if (subjectOpt.isEmpty() || !ownsSubject(subjectOpt.get(), userOpt.get())) {
            return ResponseEntity.notFound().build();
        }

        Grade newGrade = new Grade();
        newGrade.setValue(gradeRequest.getValue());
        newGrade.setSubject(subjectOpt.get());

        return ResponseEntity.ok(gradeRepository.save(newGrade));
    }

    @GetMapping("/subject/{subjectId}")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Grade>> getGradesForSubject(@PathVariable Long subjectId, Principal principal) {
        Optional<User> userOpt = resolveUser(principal);
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();

        Optional<Subject> subjectOpt = subjectRepository.findById(subjectId);
        if (subjectOpt.isEmpty() || !ownsSubject(subjectOpt.get(), userOpt.get())) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(gradeRepository.findAllBySubjectId(subjectId));
    }
}

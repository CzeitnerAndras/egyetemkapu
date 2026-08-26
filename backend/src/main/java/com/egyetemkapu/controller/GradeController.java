package com.egyetemkapu.controller;

import com.egyetemkapu.annotation.LogAction;
import com.egyetemkapu.model.Grade;
import com.egyetemkapu.model.Subject;
import com.egyetemkapu.repository.GradeRepository;
import com.egyetemkapu.repository.SubjectRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/grades")
@CrossOrigin
public class GradeController {

    private final GradeRepository gradeRepository;
    private final SubjectRepository subjectRepository;

    public GradeController(GradeRepository gradeRepository, SubjectRepository subjectRepository) {
        this.gradeRepository = gradeRepository;
        this.subjectRepository = subjectRepository;
    }

    @PostMapping("/{subjectId}")
    @LogAction("Új érdemjegy rögzítése")
    @Transactional
    public ResponseEntity<Grade> addGrade(@PathVariable Long subjectId, @RequestBody Grade gradeRequest) {
        Optional<Subject> subjectOpt = subjectRepository.findById(subjectId);

        if (subjectOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Grade newGrade = new Grade();
        newGrade.setValue(gradeRequest.getValue());
        newGrade.setSubject(subjectOpt.get());

        return ResponseEntity.ok(gradeRepository.save(newGrade));
    }

    @GetMapping("/subject/{subjectId}")
    @Transactional(readOnly = true)
    public List<Grade> getGradesForSubject(@PathVariable Long subjectId) {
        return gradeRepository.findAllBySubjectId(subjectId);
    }
}
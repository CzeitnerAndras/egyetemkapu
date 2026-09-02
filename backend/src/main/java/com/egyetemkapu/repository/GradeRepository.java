package com.egyetemkapu.repository;

import com.egyetemkapu.model.Grade;
import com.egyetemkapu.model.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface GradeRepository extends JpaRepository<Grade, Long> {
    List<Grade> findAllBySubjectId(Long subjectId);
    void deleteBySubjectIn(Collection<Subject> subjects);
}
package com.egyetemkapu.repository;

import com.egyetemkapu.model.Grade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GradeRepository extends JpaRepository<Grade, Long> {
    List<Grade> findAllBySubjectId(Long subjectId);
}
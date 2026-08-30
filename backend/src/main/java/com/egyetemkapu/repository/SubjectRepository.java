package com.egyetemkapu.repository;

import com.egyetemkapu.model.Subject;
import com.egyetemkapu.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, Long> {
    List<Subject> findAllByUser(User user);
}

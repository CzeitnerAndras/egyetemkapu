package com.egyetemkapu.repository;

import com.egyetemkapu.model.Note;
import com.egyetemkapu.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {
    List<Note> findAllByUserOrderByCreatedAtDesc(User user);
}

package com.egyetemkapu.repository;

import com.egyetemkapu.model.Task;
import com.egyetemkapu.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findAllByCompletedFalse();
    List<Task> findAllByUserAndCompletedFalse(User user);
    void deleteByUser(User user);
}
package com.egyetemkapu.controller;

import com.egyetemkapu.annotation.LogAction;
import com.egyetemkapu.model.Task;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.TaskRepository;
import com.egyetemkapu.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin
public class TaskController {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public TaskController(TaskRepository taskRepository, UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    @PostMapping
    @LogAction("Új naptár bejegyzés létrehozása")
    @Transactional
    public ResponseEntity<?> createTask(@RequestBody Task task, Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();

        Optional<User> userOpt = userRepository.findByUsername(principal.getName());
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();
        task.setId(null);
        task.setUser(userOpt.get());
        
        if (task.getTaskType() == null) task.setTaskType("Naptár");
        
        return ResponseEntity.ok(taskRepository.save(task));
    }

    @DeleteMapping("/{id}")
    @LogAction("Naptár bejegyzés törlése")
    @Transactional
    public ResponseEntity<?> deleteTask(@PathVariable Long id, Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();

        Optional<User> userOpt = userRepository.findByUsername(principal.getName());
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();

        return taskRepository.findById(id)
                .filter(task -> ownsTask(task, userOpt.get()))
                .map(task -> {
                    taskRepository.delete(task);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.status(404).build());
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<Task>> getAllTasks(Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();

        Optional<User> userOpt = userRepository.findByUsername(principal.getName());
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();

        return ResponseEntity.ok(taskRepository.findAllByUserAndCompletedFalse(userOpt.get()));
    }

    @PutMapping("/{id}")
    @LogAction("Naptár bejegyzés frissítése")
    @Transactional
    public ResponseEntity<?> updateTask(@PathVariable Long id, @RequestBody Task updatedTask, Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();

        Optional<User> userOpt = userRepository.findByUsername(principal.getName());
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();

        return taskRepository.findById(id)
                .filter(task -> ownsTask(task, userOpt.get()))
                .map(task -> {
                    task.setTitle(updatedTask.getTitle());
                    if (updatedTask.getTaskType() != null) task.setTaskType(updatedTask.getTaskType());
                    if (updatedTask.getDeadline() != null) task.setDeadline(updatedTask.getDeadline());
                    task.setCompleted(updatedTask.isCompleted());
                    task.setPingDayBefore(updatedTask.isPingDayBefore());
                    task.setPingOnDay(updatedTask.isPingOnDay());
                    task.setPingTelegramDayBefore(updatedTask.isPingTelegramDayBefore());
                    task.setPingTelegramOnDay(updatedTask.isPingTelegramOnDay());

                    return ResponseEntity.ok(taskRepository.save(task));
                })
                .orElse(ResponseEntity.status(404).build());
    }

    private boolean ownsTask(Task task, User user) {
        return task.getUser() != null && user.getId() != null && user.getId().equals(task.getUser().getId());
    }
}
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
        task.setUser(userOpt.get());
        
        if (task.getTaskType() == null) task.setTaskType("Naptár");
        
        return ResponseEntity.ok(taskRepository.save(task));
    }

    @DeleteMapping("/{id}")
    @LogAction("Naptár bejegyzés törlése")
    @Transactional
    public ResponseEntity<?> deleteTask(@PathVariable Long id, Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();
        taskRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<Task>> getAllTasks(Principal principal) {
        System.out.println("DEBUG principal = " + principal);
        if (principal == null) {
            System.out.println("DEBUG principal is NULL");
            return ResponseEntity.status(401).build();
        }
        System.out.println("DEBUG principal.getName() = " + principal.getName());

        Optional<User> userOpt = userRepository.findByUsername(principal.getName());
        System.out.println("DEBUG userOpt = " + userOpt);
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();

        return ResponseEntity.ok(taskRepository.findAllByUserAndCompletedFalse(userOpt.get()));
    }

    @PutMapping("/{id}")
    @LogAction("Naptár bejegyzés frissítése")
    @Transactional
    public ResponseEntity<?> updateTask(@PathVariable Long id, @RequestBody Task updatedTask, Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();

        return taskRepository.findById(id)
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
                .orElseThrow(() -> new RuntimeException("A feladat nem található ezzel az ID-val: " + id));
    }
}
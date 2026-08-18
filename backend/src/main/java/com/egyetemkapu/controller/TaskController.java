package com.egyetemkapu.controller;

import com.egyetemkapu.model.Task;
import com.egyetemkapu.repository.TaskRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin
public class TaskController {

    private final TaskRepository taskRepository;

    public TaskController(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @PostMapping
    public Task createTask(@RequestBody Task task) {
        if (task.getTaskType() == null) task.setTaskType("Naptár");
        return taskRepository.save(task);
    }

    @DeleteMapping("/{id}")
    public void deleteTask(@PathVariable Long id) {
        taskRepository.deleteById(id);
    }

    @GetMapping
    public List<Task> getAllTasks() {
        return taskRepository.findAllByCompletedFalse();
    }

    @PutMapping("/{id}")
    public Task updateTask(@PathVariable Long id, @RequestBody Task updatedTask) {
        return taskRepository.findById(id)
                .map(task -> {
                    task.setTitle(updatedTask.getTitle());
                    if (updatedTask.getTaskType() != null) task.setTaskType(updatedTask.getTaskType());
                    if (updatedTask.getDeadline() != null) task.setDeadline(updatedTask.getDeadline());
                    task.setCompleted(updatedTask.isCompleted());
                    task.setPingDayBefore(updatedTask.isPingDayBefore());
                    task.setPingOnDay(updatedTask.isPingOnDay());
                    return taskRepository.save(task);
                })
                .orElseThrow(() -> new RuntimeException("A feladat nem található ezzel az ID-val: " + id));
    }
}
package com.egyetemkapu.controller;

import com.egyetemkapu.model.Task;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.TaskRepository;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.JwtUtil;
import com.egyetemkapu.service.RateLimitingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;

import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.security.Principal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TaskController.class)
class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TaskRepository taskRepository;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private RateLimitingService rateLimitingService;

    @Test
    void getAllTasks_AuthorizedUser_ReturnsTasks() throws Exception {
        User mockUser = new User();
        mockUser.setUsername("teszt_hallgato");

        Task mockTask = new Task();
        mockTask.setTitle("MSc felvételi interjú");
        mockTask.setTaskType("Vizsga");

        Principal mockPrincipal = () -> "teszt_hallgato";

        when(userRepository.findByUsername("teszt_hallgato")).thenReturn(Optional.of(mockUser));
        when(taskRepository.findAllByUserAndCompletedFalse(mockUser)).thenReturn(List.of(mockTask));

        mockMvc.perform(get("/api/tasks")
                .with(user("teszt_hallgato"))
                .principal(mockPrincipal)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("MSc felvételi interjú"))
                .andExpect(jsonPath("$[0].taskType").value("Vizsga"));
    }

    @Test
    void getAllTasks_UnauthorizedUser_Returns401() throws Exception {
        mockMvc.perform(get("/api/tasks")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createTask_IgnoresClientSuppliedId() throws Exception {
        User mockUser = new User();
        mockUser.setId(1L);
        mockUser.setUsername("teszt_hallgato");

        when(userRepository.findByUsername("teszt_hallgato")).thenReturn(Optional.of(mockUser));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post("/api/tasks")
                .with(user("teszt_hallgato"))
                .principal(() -> "teszt_hallgato")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                            "id": 99,
                            "title": "Másik user feladata",
                            "taskType": "Vizsga",
                            "deadline": "2026-12-31T10:00:00",
                            "completed": false,
                            "pingDayBefore": false,
                            "pingOnDay": false,
                            "pingTelegramDayBefore": false,
                            "pingTelegramOnDay": false
                        }
                        """))
                .andExpect(status().isOk());

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository).save(captor.capture());
        assertNull(captor.getValue().getId());
        assertEquals(mockUser, captor.getValue().getUser());
        assertEquals("Másik user feladata", captor.getValue().getTitle());
    }
}
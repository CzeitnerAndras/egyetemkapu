package com.egyetemkapu.controller;

import com.egyetemkapu.model.Task;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.TaskRepository;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.ClientIpResolver;
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
import static org.mockito.Mockito.never;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

    @MockitoBean
    private ClientIpResolver clientIpResolver;

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
                .header("Origin", "https://egyetemkapu.hu")
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
                            "pingTelegramOnDay": false,
                            "pingHoursBefore": 6
                        }
                        """))
                .andExpect(status().isOk());

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository).save(captor.capture());
        assertNull(captor.getValue().getId());
        assertEquals(mockUser, captor.getValue().getUser());
        assertEquals("Másik user feladata", captor.getValue().getTitle());
        assertEquals(6, captor.getValue().getPingHoursBefore());
    }

    @Test
    void createTask_defaultsAMissingTypeToCalendar() throws Exception {
        User mockUser = new User();
        mockUser.setId(1L);
        mockUser.setUsername("teszt_hallgato");
        when(userRepository.findByUsername("teszt_hallgato")).thenReturn(Optional.of(mockUser));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post("/api/tasks")
                        .with(user("teszt_hallgato"))
                        .principal(() -> "teszt_hallgato")
                        .header("Origin", "https://egyetemkapu.hu")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "title": "Beadandó",
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
        assertEquals("Naptár", captor.getValue().getTaskType());
    }

    @Test
    void updateTask_changesATaskTheUserOwns() throws Exception {
        User owner = signedIn(1L, "teszt_hallgato");
        Task task = ownedTask(5L, owner);
        when(taskRepository.findById(5L)).thenReturn(Optional.of(task));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(put("/api/tasks/5")
                        .with(user("teszt_hallgato"))
                        .principal(() -> "teszt_hallgato")
                        .header("Origin", "https://egyetemkapu.hu")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "title": "Átírt cím",
                                    "taskType": "Beadandó",
                                    "deadline": "2026-11-01T08:00:00",
                                    "completed": true,
                                    "pingDayBefore": false,
                                    "pingOnDay": true,
                                    "pingTelegramDayBefore": false,
                                    "pingTelegramOnDay": false,
                                    "pingHoursBefore": 6
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Átírt cím"))
                .andExpect(jsonPath("$.completed").value(true));

        assertEquals(6, task.getPingHoursBefore());
    }

    @Test
    void updateTask_hidesAnotherUsersTask() throws Exception {
        User owner = signedIn(1L, "tulaj");
        signedIn(2L, "masik");
        when(taskRepository.findById(5L)).thenReturn(Optional.of(ownedTask(5L, owner)));

        mockMvc.perform(put("/api/tasks/5")
                        .with(user("masik"))
                        .principal(() -> "masik")
                        .header("Origin", "https://egyetemkapu.hu")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "title": "Idegen",
                                    "completed": false,
                                    "pingDayBefore": false,
                                    "pingOnDay": false,
                                    "pingTelegramDayBefore": false,
                                    "pingTelegramOnDay": false
                                }
                                """))
                .andExpect(status().isNotFound());

        verify(taskRepository, never()).save(any());
    }

    @Test
    void deleteTask_removesATaskTheUserOwns() throws Exception {
        User owner = signedIn(1L, "teszt_hallgato");
        Task task = ownedTask(5L, owner);
        when(taskRepository.findById(5L)).thenReturn(Optional.of(task));

        mockMvc.perform(delete("/api/tasks/5")
                        .with(user("teszt_hallgato"))
                        .principal(() -> "teszt_hallgato")
                        .header("Origin", "https://egyetemkapu.hu"))
                .andExpect(status().isOk());

        verify(taskRepository).delete(task);
    }

    @Test
    void deleteTask_missingTaskReturns404() throws Exception {
        signedIn(1L, "teszt_hallgato");
        when(taskRepository.findById(5L)).thenReturn(Optional.empty());

        mockMvc.perform(delete("/api/tasks/5")
                        .with(user("teszt_hallgato"))
                        .principal(() -> "teszt_hallgato")
                        .header("Origin", "https://egyetemkapu.hu"))
                .andExpect(status().isNotFound());

        verify(taskRepository, never()).delete(any());
    }

    private User signedIn(long id, String username) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        when(userRepository.findByUsername(username)).thenReturn(Optional.of(user));
        return user;
    }

    private static Task ownedTask(long id, User owner) {
        Task task = new Task();
        task.setId(id);
        task.setUser(owner);
        task.setTitle("Régi");
        task.setTaskType("Vizsga");
        return task;
    }
}
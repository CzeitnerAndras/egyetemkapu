package com.egyetemkapu.controller;

import com.egyetemkapu.model.Subject;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.SubjectRepository;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.ClientIpResolver;
import com.egyetemkapu.security.JwtUtil;
import com.egyetemkapu.service.RateLimitingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SubjectController.class)
@AutoConfigureMockMvc(addFilters = false)
class SubjectControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SubjectRepository subjectRepository;
    @MockitoBean
    private UserRepository userRepository;
    @MockitoBean
    private JwtUtil jwtUtil;
    @MockitoBean
    private RateLimitingService rateLimitingService;
    @MockitoBean
    private ClientIpResolver clientIpResolver;

    @Test
    void createSubject_withoutASessionReturns401() throws Exception {
        mockMvc.perform(post("/api/subjects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Analízis\",\"credit\":5}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createSubject_ignoresAClientSuppliedIdAndAssignsTheUser() throws Exception {
        User anna = user(1L, "anna");
        when(userRepository.findByUsername("anna")).thenReturn(Optional.of(anna));
        when(subjectRepository.save(any(Subject.class))).thenAnswer(invocation -> {
            Subject subject = invocation.getArgument(0);
            assertNull(subject.getId());
            assertEquals(anna, subject.getUser());
            assertEquals("Analízis", subject.getName());
            assertEquals(5, subject.getCredit());
            subject.setId(4L);
            return subject;
        });

        mockMvc.perform(post("/api/subjects")
                        .principal(() -> "anna")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":99,\"name\":\"Analízis\",\"credit\":5}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(4))
                .andExpect(jsonPath("$.name").value("Analízis"));
    }

    @Test
    void getAllSubjects_returnsTheSignedInUsersSubjects() throws Exception {
        User anna = user(1L, "anna");
        when(userRepository.findByUsername("anna")).thenReturn(Optional.of(anna));
        Subject subject = new Subject();
        subject.setName("Analízis");
        subject.setCredit(5);
        when(subjectRepository.findAllByUser(anna)).thenReturn(List.of(subject));

        mockMvc.perform(get("/api/subjects").principal(() -> "anna"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Analízis"))
                .andExpect(jsonPath("$[0].credit").value(5));
    }

    private static User user(long id, String username) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        return user;
    }
}

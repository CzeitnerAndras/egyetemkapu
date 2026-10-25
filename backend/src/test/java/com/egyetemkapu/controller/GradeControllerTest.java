package com.egyetemkapu.controller;

import com.egyetemkapu.model.Grade;
import com.egyetemkapu.model.Subject;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.GradeRepository;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(GradeController.class)
@AutoConfigureMockMvc(addFilters = false)
class GradeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GradeRepository gradeRepository;
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
    void addGrade_withoutASessionReturns401() throws Exception {
        mockMvc.perform(post("/api/grades/2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"value\":5}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void addGrade_savesAGradeOnASubjectTheUserOwns() throws Exception {
        User anna = user(1L, "anna");
        Subject subject = subject(2L, anna);
        when(userRepository.findByUsername("anna")).thenReturn(Optional.of(anna));
        when(subjectRepository.findById(2L)).thenReturn(Optional.of(subject));
        when(gradeRepository.save(any(Grade.class))).thenAnswer(invocation -> {
            Grade grade = invocation.getArgument(0);
            assertEquals(5, grade.getValue());
            assertEquals(subject, grade.getSubject());
            grade.setId(9L);
            return grade;
        });

        mockMvc.perform(post("/api/grades/2")
                        .principal(() -> "anna")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"value\":5}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.value").value(5));
    }

    @Test
    void addGrade_rejectsASubjectOwnedBySomeoneElse() throws Exception {
        User anna = user(1L, "anna");
        User bela = user(2L, "bela");
        when(userRepository.findByUsername("bela")).thenReturn(Optional.of(bela));
        when(subjectRepository.findById(2L)).thenReturn(Optional.of(subject(2L, anna)));

        mockMvc.perform(post("/api/grades/2")
                        .principal(() -> "bela")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"value\":5}"))
                .andExpect(status().isNotFound());

        verify(gradeRepository, never()).save(any());
    }

    @Test
    void getGradesForSubject_returnsGradesForAnOwnedSubject() throws Exception {
        User anna = user(1L, "anna");
        when(userRepository.findByUsername("anna")).thenReturn(Optional.of(anna));
        when(subjectRepository.findById(2L)).thenReturn(Optional.of(subject(2L, anna)));
        Grade grade = new Grade();
        grade.setValue(4);
        when(gradeRepository.findAllBySubjectId(2L)).thenReturn(List.of(grade));

        mockMvc.perform(get("/api/grades/subject/2").principal(() -> "anna"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].value").value(4));
    }

    private static User user(long id, String username) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        return user;
    }

    private static Subject subject(long id, User owner) {
        Subject subject = new Subject();
        subject.setId(id);
        subject.setName("Analízis");
        subject.setCredit(5);
        subject.setUser(owner);
        return subject;
    }
}

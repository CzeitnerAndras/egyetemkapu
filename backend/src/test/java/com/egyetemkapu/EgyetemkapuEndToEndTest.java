package com.egyetemkapu;

import com.egyetemkapu.model.Task;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.TaskRepository;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.JwtUtil;
import com.egyetemkapu.service.RateLimitingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
@AutoConfigureMockMvc
class EgyetemkapuEndToEndTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private JwtUtil jwtUtil;
    
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockitoBean
    private RateLimitingService rateLimitingService;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("TRUNCATE TABLE users CASCADE");
    }

    @Test
    void fullTaskCreationAndRetrievalFlow() throws Exception {
        User testUser = new User();
        testUser.setUsername("e2e_tester");
        testUser.setEmail("e2e@egyetemkapu.hu");
        testUser.setPassword("Titkos123!");
        testUser.setRole("ROLE_USER");
        userRepository.save(testUser);

        String realJwtToken = jwtUtil.generateToken("e2e_tester");

        String taskPayload = """
                {
                    "title": "E2E Integrációs Vizsga",
                    "taskType": "Vizsga",
                    "deadline": "2026-12-31T10:00:00",
                    "completed": false,
                    "pingDayBefore": false,
                    "pingOnDay": false,
                    "pingTelegramDayBefore": false,
                    "pingTelegramOnDay": false
                }
                """;

        mockMvc.perform(post("/api/tasks")
                .header("Authorization", "Bearer " + realJwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(taskPayload))
                .andExpect(status().isOk());

        assertEquals(1, taskRepository.findAll().size(), "A feladatnak fizikailag be kellett kerülnie az adatbázisba!");
        Task savedTask = taskRepository.findAll().get(0);
        assertEquals("E2E Integrációs Vizsga", savedTask.getTitle());
        assertEquals("e2e_tester", savedTask.getUser().getUsername(), "A feladatnak a token alapján a megfelelő userhez kell tartoznia");
   
        mockMvc.perform(get("/api/tasks")
                .header("Authorization", "Bearer " + realJwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("E2E Integrációs Vizsga"))
                .andExpect(jsonPath("$[0].taskType").value("Vizsga"));
    }
}
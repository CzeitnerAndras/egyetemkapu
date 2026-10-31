package com.egyetemkapu.repository;

import com.egyetemkapu.model.ReminderChannel;
import com.egyetemkapu.model.ReminderKind;
import com.egyetemkapu.model.ReminderOutbox;
import com.egyetemkapu.model.ReminderStatus;
import com.egyetemkapu.model.Task;
import com.egyetemkapu.model.User;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ImportAutoConfiguration(FlywayAutoConfiguration.class)
class ReminderOutboxRepositoryTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 9, 1, 8, 0);

    @Autowired
    private ReminderOutboxRepository reminderOutboxRepository;
    @Autowired
    private TaskRepository taskRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private EntityManager entityManager;

    @Test
    void claimPendingTakesTheOldestDueRowAndLeavesTheOthers() {
        Task task = savedTask();
        ReminderOutbox older = save(pending(task, "key-older", NOW.minusMinutes(5)));
        ReminderOutbox newer = save(pending(task, "key-newer", NOW));
        ReminderOutbox future = save(pending(task, "key-future", NOW.plusHours(1)));

        List<ReminderOutbox> claimed = reminderOutboxRepository.claimPending(NOW, 1);

        assertEquals(1, claimed.size());
        assertEquals("key-older", claimed.get(0).getIdempotencyKey());
        assertEquals(ReminderStatus.SENDING, claimed.get(0).getStatus());
        assertEquals(1, claimed.get(0).getAttempts());
        assertEquals(NOW, claimed.get(0).getClaimedAt());

        entityManager.clear();
        assertEquals(ReminderStatus.SENDING, reload(older.getId()).getStatus());
        assertEquals(ReminderStatus.PENDING, reload(newer.getId()).getStatus());
        assertEquals(ReminderStatus.PENDING, reload(future.getId()).getStatus());

        List<ReminderOutbox> next = reminderOutboxRepository.claimPending(NOW, 20);
        assertEquals(List.of("key-newer"), next.stream().map(ReminderOutbox::getIdempotencyKey).toList());
    }

    @Test
    void recoverStaleClaimsReturnsExpiredSendsAndKillsTheLastAttempt() {
        Task task = savedTask();
        ReminderOutbox retry = save(sending(task, "key-retry", 1, NOW.minusMinutes(5)));
        ReminderOutbox dead = save(sending(task, "key-dead", 5, NOW.minusMinutes(5)));
        ReminderOutbox fresh = save(sending(task, "key-fresh", 1, NOW));

        int recovered = reminderOutboxRepository.recoverStaleClaims(NOW.minusMinutes(2), NOW, 5);

        assertEquals(2, recovered);
        entityManager.clear();
        ReminderOutbox retried = reload(retry.getId());
        assertEquals(ReminderStatus.PENDING, retried.getStatus());
        assertEquals(1, retried.getAttempts());
        assertEquals(NOW, retried.getAvailableAt());
        assertEquals("claim expired", retried.getLastError());
        assertNull(retried.getClaimedAt());
        assertEquals(ReminderStatus.DEAD, reload(dead.getId()).getStatus());
        assertEquals(ReminderStatus.SENDING, reload(fresh.getId()).getStatus());
    }

    private Task savedTask() {
        User user = new User();
        user.setUsername("reminder-user");
        user.setEmail("reminder@egyetemkapu.hu");
        user.setPassword("secret");
        user.setRole("ROLE_USER");
        userRepository.save(user);

        Task task = new Task();
        task.setTitle("Analízis");
        task.setTaskType("Vizsga");
        task.setDeadline(NOW);
        task.setCompleted(false);
        task.setPingOnDay(true);
        task.setUser(user);
        return taskRepository.save(task);
    }

    private ReminderOutbox save(ReminderOutbox row) {
        return reminderOutboxRepository.saveAndFlush(row);
    }

    private ReminderOutbox reload(Long id) {
        return reminderOutboxRepository.findById(id).orElseThrow();
    }

    private static ReminderOutbox pending(Task task, String key, LocalDateTime availableAt) {
        ReminderOutbox row = new ReminderOutbox();
        row.setIdempotencyKey(key);
        row.setTaskId(task.getId());
        row.setUserId(task.getUser().getId());
        row.setChannel(ReminderChannel.DISCORD);
        row.setKind(ReminderKind.AT_DEADLINE);
        row.setHoursBefore(0);
        row.setDeadline(NOW);
        row.setMessage("most lejár");
        row.setStatus(ReminderStatus.PENDING);
        row.setAttempts(0);
        row.setAvailableAt(availableAt);
        row.setCreatedAt(NOW);
        return row;
    }

    private static ReminderOutbox sending(Task task, String key, int attempts, LocalDateTime claimedAt) {
        ReminderOutbox row = pending(task, key, NOW);
        row.setStatus(ReminderStatus.SENDING);
        row.setAttempts(attempts);
        row.setClaimedAt(claimedAt);
        return row;
    }
}

package com.egyetemkapu.service;

import com.egyetemkapu.dto.FlyerSyncRunDto;
import com.egyetemkapu.model.FlyerSyncRun;
import com.egyetemkapu.repository.FlyerSyncRunRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FlyerSyncLogTest {

    @Mock private FlyerSyncRunRepository repository;
    @InjectMocks private FlyerSyncLog log;

    // --- Record ---
    @Test
    void recordsSuccessAndDropsRunsOlderThanThirtyDays() {
        LocalDateTime started = LocalDateTime.of(2026, 10, 29, 6, 30);
        LocalDateTime finished = started.plusMinutes(2);

        log.record("aldi", started, finished, 840, null);

        verify(repository).deleteByStartedAtBefore(finished.minusDays(30));
        ArgumentCaptor<FlyerSyncRun> saved = ArgumentCaptor.forClass(FlyerSyncRun.class);
        verify(repository).save(saved.capture());
        assertEquals("aldi", saved.getValue().getStore());
        assertEquals("ok", saved.getValue().getStatus());
        assertEquals(840, saved.getValue().getProductCount());
        assertNull(saved.getValue().getErrorMessage());
    }

    @Test
    void blankErrorIsStoredAsAFailedRunWithoutAMessage() {
        LocalDateTime started = LocalDateTime.of(2026, 10, 29, 6, 30);
        log.record("real", started, started.plusSeconds(1), 12, "   ");

        ArgumentCaptor<FlyerSyncRun> saved = ArgumentCaptor.forClass(FlyerSyncRun.class);
        verify(repository).save(saved.capture());
        assertEquals("failed", saved.getValue().getStatus());
        assertEquals(0, saved.getValue().getProductCount());
        assertNull(saved.getValue().getErrorMessage());
    }

    @Test
    void recordsAFailureWithAShortError() {
        LocalDateTime started = LocalDateTime.of(2026, 10, 29, 6, 30);
        log.record("coop", started, started.plusSeconds(3), 40, "x".repeat(1200));

        ArgumentCaptor<FlyerSyncRun> saved = ArgumentCaptor.forClass(FlyerSyncRun.class);
        verify(repository).save(saved.capture());
        assertEquals("failed", saved.getValue().getStatus());
        assertEquals(0, saved.getValue().getProductCount());
        assertEquals(1000, saved.getValue().getErrorMessage().length());
    }

    // --- Latest ---
    @Test
    void latestKeepsTheNewestRunPerStoreAndMarksTheRestAsNever() {
        when(repository.findAllByOrderByStartedAtDesc()).thenReturn(List.of(
                run("spar", "ok", 10, LocalDateTime.of(2026, 10, 29, 6, 31)),
                run("spar", "failed", 0, LocalDateTime.of(2026, 10, 28, 6, 31)),
                run("aldi", "failed", 0, LocalDateTime.of(2026, 10, 29, 6, 30))));

        List<FlyerSyncRunDto> rows = log.latest();

        assertEquals(FlyerSyncService.stores(), rows.stream().map(FlyerSyncRunDto::store).toList());
        assertEquals("failed", rows.getFirst().status());
        assertEquals("ok", rows.get(1).status());
        assertEquals(10, rows.get(1).productCount());
        assertTrue(rows.stream().filter(row -> "coop".equals(row.store()))
                .allMatch(row -> "never".equals(row.status()) && row.productCount() == 0));
    }

    // --- Fixture ---
    private static FlyerSyncRun run(String store, String status, int count, LocalDateTime started) {
        FlyerSyncRun run = new FlyerSyncRun();
        run.setStore(store);
        run.setStatus(status);
        run.setProductCount(count);
        run.setStartedAt(started);
        run.setFinishedAt(started.plusMinutes(1));
        run.setErrorMessage("failed".equals(status) ? "down" : null);
        return run;
    }
}

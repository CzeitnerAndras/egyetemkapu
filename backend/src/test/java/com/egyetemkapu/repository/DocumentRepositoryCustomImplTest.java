package com.egyetemkapu.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.persistence.Tuple;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentRepositoryCustomImplTest {

    @Mock private EntityManager entityManager;
    @Mock private Query query;
    @Mock private Tuple tuple;

    private DocumentRepositoryCustomImpl repository;

    @BeforeEach
    void setUp() {
        repository = new DocumentRepositoryCustomImpl(entityManager);
        when(entityManager.createNativeQuery(anyString(), eq(Tuple.class))).thenReturn(query);
        when(query.setParameter(anyString(), any())).thenReturn(query);
    }

    @Test
    void blankCategoryIsNotAppliedAndTimestampsAreNormalised() {
        LocalDateTime created = LocalDateTime.of(2026, 10, 29, 8, 0);
        when(query.getResultList()).thenReturn(List.of(tuple));
        when(tuple.get("id")).thenReturn(7);
        when(tuple.get("title")).thenReturn("Kérdés");
        when(tuple.get("description")).thenReturn(null);
        when(tuple.get("category")).thenReturn("Fizika");
        when(tuple.get("file_name")).thenReturn("jegyzet.pdf");
        when(tuple.get("created_at")).thenReturn(Timestamp.valueOf(created));
        when(tuple.get("username")).thenReturn("anna");
        when(tuple.get("snippet")).thenReturn(null);

        List<DocumentSearchRow> hits = repository.searchApproved("kerdes", "  ");

        assertEquals(1, hits.size());
        DocumentSearchRow hit = hits.getFirst();
        assertEquals(7L, hit.id());
        assertEquals("Kérdés", hit.title());
        assertNull(hit.description());
        assertEquals("Fizika", hit.category());
        assertEquals("jegyzet.pdf", hit.fileName());
        assertEquals(created, hit.createdAt());
        assertEquals("anna", hit.uploaderUsername());
        assertNull(hit.snippet());
        verify(query).setParameter("applyCategory", false);
        verify(query).setParameter("category", "");
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(entityManager).createNativeQuery(sql.capture(), eq(Tuple.class));
        assertTrue(sql.getValue().contains("LIMIT " + DocumentRepositoryCustomImpl.LIMIT));
    }

    @Test
    void categoryFilterKeepsOffsetTimestamps() {
        LocalDateTime created = LocalDateTime.of(2026, 10, 29, 9, 30);
        when(query.getResultList()).thenReturn(List.of(tuple));
        when(tuple.get("id")).thenReturn(8L);
        when(tuple.get("title")).thenReturn("Alma");
        when(tuple.get("description")).thenReturn("Gyümölcs");
        when(tuple.get("category")).thenReturn("Gazdaság");
        when(tuple.get("file_name")).thenReturn("alma.pdf");
        when(tuple.get("created_at")).thenReturn(OffsetDateTime.of(created, ZoneOffset.UTC));
        when(tuple.get("username")).thenReturn("bela");
        when(tuple.get("snippet")).thenReturn("alma");

        List<DocumentSearchRow> hits = repository.searchApproved("alma", "Gazdaság");

        assertEquals(created, hits.getFirst().createdAt());
        assertEquals("alma", hits.getFirst().snippet());
        verify(query).setParameter("applyCategory", true);
        verify(query).setParameter("category", "Gazdaság");
    }

    @Test
    void unknownTimestampBecomesNull() {
        when(query.getResultList()).thenReturn(List.of(tuple));
        when(tuple.get("id")).thenReturn(1L);
        when(tuple.get("title")).thenReturn("Cím");
        when(tuple.get("description")).thenReturn("Leírás");
        when(tuple.get("category")).thenReturn("Fizika");
        when(tuple.get("file_name")).thenReturn("a.pdf");
        when(tuple.get("created_at")).thenReturn("not-a-time");
        when(tuple.get("username")).thenReturn("anna");
        when(tuple.get("snippet")).thenReturn("cím");

        assertNull(repository.searchApproved("cim", null).getFirst().createdAt());
    }
}

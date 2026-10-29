package com.egyetemkapu.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

class DocumentRepositoryCustomImpl implements DocumentRepositoryCustom {

    static final int LIMIT = 50;
    static final String MARK_START = "\u001E";
    static final String MARK_END = "\u001F";

    private final EntityManager entityManager;

    DocumentRepositoryCustomImpl(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    // --- Hungarian search ---
    @Override
    public List<DocumentSearchRow> searchApproved(String query, String category) {
        boolean applyCategory = category != null && !category.isBlank();
        String sql = """
                SELECT d.id AS id,
                       d.title AS title,
                       d.description AS description,
                       d.category AS category,
                       d.file_name AS file_name,
                       d.created_at AS created_at,
                       u.username AS username,
                       ts_headline(
                           'hungarian_search'::regconfig,
                           d.title || ' ' || d.description,
                           plainto_tsquery('hungarian_search'::regconfig, :query),
                           :headline
                       ) AS snippet
                FROM documents d
                JOIN users u ON u.id = d.uploader_id
                WHERE d.status = 'APPROVED'
                  AND d.search_vector @@ plainto_tsquery('hungarian_search'::regconfig, :query)
                  AND (:applyCategory = FALSE OR d.category = :category)
                ORDER BY ts_rank(d.search_vector, plainto_tsquery('hungarian_search'::regconfig, :query), 1) DESC,
                         d.created_at DESC,
                         d.id DESC
                LIMIT %d
                """.formatted(LIMIT);

        @SuppressWarnings("unchecked")
        List<Tuple> rows = entityManager.createNativeQuery(sql, Tuple.class)
                .setParameter("query", query)
                .setParameter("headline", "StartSel=" + MARK_START + ", StopSel=" + MARK_END
                        + ", MaxFragments=1, MaxWords=24, MinWords=8, ShortWord=2")
                .setParameter("applyCategory", applyCategory)
                .setParameter("category", applyCategory ? category : "")
                .getResultList();

        List<DocumentSearchRow> hits = new ArrayList<>();
        for (Tuple row : rows) {
            hits.add(new DocumentSearchRow(
                    asLong(row.get("id")),
                    asString(row.get("title")),
                    asString(row.get("description")),
                    asString(row.get("category")),
                    asString(row.get("file_name")),
                    asTime(row.get("created_at")),
                    asString(row.get("username")),
                    asString(row.get("snippet"))));
        }
        return hits;
    }

    private static String asString(Object value) {
        return value == null ? null : value.toString();
    }

    private static long asLong(Object value) {
        return ((Number) value).longValue();
    }

    private static LocalDateTime asTime(Object value) {
        if (value instanceof LocalDateTime time) {
            return time;
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }
        if (value instanceof OffsetDateTime offset) {
            return offset.toLocalDateTime();
        }
        return null;
    }
}

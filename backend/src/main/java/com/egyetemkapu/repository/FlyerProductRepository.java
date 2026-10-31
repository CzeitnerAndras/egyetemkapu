package com.egyetemkapu.repository;

import com.egyetemkapu.model.FlyerProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface FlyerProductRepository extends JpaRepository<FlyerProduct, Long> {

    // --- Row ---
    interface SearchRow {
        Long getProductId();

        Long getFlyerId();

        String getStore();

        String getTitle();

        Integer getPageNumber();

        String getName();
    }

    // --- Candidates ---
    @Query(value = """
            SELECT p.id AS product_id,
                   f.id AS flyer_id,
                   f.store AS store,
                   f.title AS title,
                   p.page_number AS page_number,
                   p.name AS name
            FROM flyer_products p
            JOIN flyers f ON f.id = p.flyer_id
            WHERE p.name_folded <> ''
              AND (
                    p.name_folded LIKE :like ESCAPE '\\'
                 OR (char_length(:q) >= 5 AND p.name_folded %>> :q)
              )
              AND (f.valid_to IS NULL OR f.valid_to >= :today)
              AND (f.valid_from IS NULL OR f.valid_from <= :horizon)
              AND EXISTS (SELECT 1 FROM flyer_pages pg WHERE pg.flyer_id = f.id)
            ORDER BY f.store, f.id, p.id
            """, nativeQuery = true)
    List<SearchRow> searchCandidates(
            @Param("q") String foldedQuery,
            @Param("like") String likePattern,
            @Param("today") LocalDate today,
            @Param("horizon") LocalDate horizon);
}

package com.egyetemkapu.repository;

import com.egyetemkapu.model.Document;
import com.egyetemkapu.model.DocumentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByStatusOrderByCreatedAtDesc(DocumentStatus status);
    List<Document> findByCategoryAndStatusOrderByCreatedAtDesc(String category, DocumentStatus status);
}
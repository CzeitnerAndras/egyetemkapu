package com.egyetemkapu.service;

import com.egyetemkapu.model.Document;
import com.egyetemkapu.model.DocumentStatus;
import com.egyetemkapu.repository.DocumentRepository;
import com.egyetemkapu.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentServiceTest {

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private UserRepository userRepository;

    private DocumentService documentService;
    private Path uploadRoot;

    @BeforeEach
    void setUp() {
        documentService = new DocumentService(documentRepository, userRepository);
        uploadRoot = Paths.get("uploads").toAbsolutePath().normalize();
    }

    @Test
    void getApprovedDocument_rejectsPendingFiles() {
        when(documentRepository.findById(3L)).thenReturn(Optional.of(pendingDocument(3L)));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> documentService.getApprovedDocument(3L));
        assertEquals("A dokumentum még nem érhető el letöltésre", ex.getMessage());
    }

    @Test
    void getDocumentForAdminDownload_allowsPendingFiles() {
        Document pending = pendingDocument(3L);
        when(documentRepository.findById(3L)).thenReturn(Optional.of(pending));

        assertEquals(pending, documentService.getDocumentForAdminDownload(3L));
    }

    @Test
    void getApprovedDocument_allowsApprovedFiles() {
        Document approved = pendingDocument(4L);
        approved.setStatus(DocumentStatus.APPROVED);
        when(documentRepository.findById(4L)).thenReturn(Optional.of(approved));

        assertEquals(approved, documentService.getApprovedDocument(4L));
    }

    private Document pendingDocument(Long id) {
        Document document = new Document();
        document.setId(id);
        document.setTitle("Jegyzet");
        document.setDescription("Leírás");
        document.setCategory("Egyéb");
        document.setFileName("anyag.pdf");
        document.setFilePath(uploadRoot.resolve("uuid_anyag.pdf").toString());
        document.setStatus(DocumentStatus.PENDING);
        return document;
    }
}

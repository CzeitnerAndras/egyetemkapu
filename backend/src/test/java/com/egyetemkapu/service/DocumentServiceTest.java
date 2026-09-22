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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
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

    @Test
    void getApprovedDocument_rejectsMissingDocuments() {
        when(documentRepository.findById(99L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> documentService.getApprovedDocument(99L));
        assertEquals("Dokumentum nem található", ex.getMessage());
    }

    @Test
    void getApprovedDocument_rejectsPathsOutsideUploadRoot() {
        Document leaked = pendingDocument(5L);
        leaked.setStatus(DocumentStatus.APPROVED);
        leaked.setFilePath(uploadRoot.getParent().resolve("secret.txt").toString());
        when(documentRepository.findById(5L)).thenReturn(Optional.of(leaked));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> documentService.getApprovedDocument(5L));
        assertEquals("Érvénytelen fájlútvonal", ex.getMessage());
    }

    @Test
    void getDocumentForAdminDownload_rejectsPathsOutsideUploadRoot() {
        Document leaked = pendingDocument(6L);
        leaked.setFilePath(uploadRoot.resolve("..").resolve("secret.txt").normalize().toString());
        when(documentRepository.findById(6L)).thenReturn(Optional.of(leaked));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> documentService.getDocumentForAdminDownload(6L));
        assertEquals("Érvénytelen fájlútvonal", ex.getMessage());
    }

    @Test
    void isAllowedUpload_acceptsPdfJpegPngMagicBytes() {
        assertTrue(DocumentService.isAllowedUpload("jegyzet.pdf", "%PDF-1.4".getBytes()));
        assertTrue(DocumentService.isAllowedUpload("kep.PNG", new byte[]{
                (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00
        }));
        assertTrue(DocumentService.isAllowedUpload("foto.jpg", new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x10}));
        assertTrue(DocumentService.isAllowedUpload("foto.jpeg", new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x10}));
    }

    @Test
    void isAllowedUpload_rejectsUnknownOrMismatchedTypes() {
        assertFalse(DocumentService.isAllowedUpload("virus.exe", new byte[]{'M', 'Z'}));
        assertFalse(DocumentService.isAllowedUpload("hamis.pdf", new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF}));
        assertFalse(DocumentService.isAllowedUpload("jegyzet.docx", "%PDF-1.4".getBytes()));
        assertFalse(DocumentService.isAllowedUpload("ures.pdf", new byte[0]));
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

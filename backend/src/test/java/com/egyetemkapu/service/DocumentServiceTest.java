package com.egyetemkapu.service;

import com.egyetemkapu.model.Document;
import com.egyetemkapu.model.DocumentStatus;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.DocumentRepository;
import com.egyetemkapu.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
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
        assertFalse(DocumentService.isAllowedUpload(null, "%PDF-1.4".getBytes()));
    }

    @Test
    void uploadDocument_rejectsEmptyOversizedAndDisguisedFiles() throws Exception {
        when(userRepository.findByUsername("diak")).thenReturn(Optional.of(uploader()));

        IllegalArgumentException empty = assertThrows(IllegalArgumentException.class, () ->
                documentService.uploadDocument(new MockMultipartFile("file", "ures.pdf", "application/pdf", new byte[0]),
                        "Cím", "Leírás", "Egyéb", "diak"));
        assertEquals("Üres fájl nem tölthető fel", empty.getMessage());

        MultipartFile oversized = mock(MultipartFile.class);
        when(oversized.isEmpty()).thenReturn(false);
        when(oversized.getSize()).thenReturn(DocumentService.MAX_UPLOAD_BYTES + 1);
        IllegalArgumentException tooBig = assertThrows(IllegalArgumentException.class, () ->
                documentService.uploadDocument(oversized, "Cím", "Leírás", "Egyéb", "diak"));
        assertEquals("A fájl maximum 10 MB lehet", tooBig.getMessage());

        IllegalArgumentException disguised = assertThrows(IllegalArgumentException.class, () ->
                documentService.uploadDocument(
                        new MockMultipartFile("file", "jegyzet.pdf.exe", "application/pdf", "%PDF-1.4".getBytes()),
                        "Cím", "Leírás", "Egyéb", "diak"));
        assertEquals("Csak PDF, JPEG vagy PNG fájl tölthető fel", disguised.getMessage());
        verify(documentRepository, never()).save(any());
    }

    @Test
    void uploadDocument_sanitizesTraversalNameAndStoresPendingPdf() throws Exception {
        when(userRepository.findByUsername("diak")).thenReturn(Optional.of(uploader()));
        when(documentRepository.save(any(Document.class))).thenAnswer(invocation -> invocation.getArgument(0));
        MockMultipartFile file = new MockMultipartFile(
                "file", "../../jegyzet (1).pdf", "application/pdf", "%PDF-1.4".getBytes());

        Document saved = documentService.uploadDocument(file, "Cím", "Leírás", "Egyéb", "diak");
        Path stored = Paths.get(saved.getFilePath());
        try {
            assertEquals("jegyzet__1_.pdf", saved.getFileName());
            assertEquals(DocumentStatus.PENDING, saved.getStatus());
            assertTrue(stored.startsWith(uploadRoot));
            assertTrue(Files.exists(stored));
        } finally {
            Files.deleteIfExists(stored);
        }
    }

    @Test
    void getApprovedDocuments_filtersByCategoryWhenGiven() {
        when(documentRepository.findByCategoryAndStatusOrderByCreatedAtDesc("Matek", DocumentStatus.APPROVED))
                .thenReturn(List.of());
        when(documentRepository.findByStatusOrderByCreatedAtDesc(DocumentStatus.APPROVED)).thenReturn(List.of());

        documentService.getApprovedDocuments("Matek");
        documentService.getApprovedDocuments("");
        documentService.getApprovedDocuments(null);

        verify(documentRepository).findByCategoryAndStatusOrderByCreatedAtDesc("Matek", DocumentStatus.APPROVED);
        verify(documentRepository, times(2))
                .findByStatusOrderByCreatedAtDesc(DocumentStatus.APPROVED);
    }

    @Test
    void approveDocument_marksPendingFileApproved() {
        Document pending = pendingDocument(8L);
        when(documentRepository.findById(8L)).thenReturn(Optional.of(pending));
        when(documentRepository.save(pending)).thenReturn(pending);

        Document approved = documentService.approveDocument(8L);

        assertEquals(DocumentStatus.APPROVED, approved.getStatus());
    }

    @Test
    void rejectDocument_deletesFileAndRow() throws Exception {
        Path file = uploadRoot.resolve("torlendo.pdf");
        Files.createDirectories(uploadRoot);
        Files.writeString(file, "tartalom");
        Document pending = pendingDocument(9L);
        pending.setFilePath(file.toString());
        when(documentRepository.findById(9L)).thenReturn(Optional.of(pending));

        try {
            documentService.rejectDocument(9L);
            assertFalse(Files.exists(file));
            verify(documentRepository).delete(pending);
        } finally {
            Files.deleteIfExists(file);
        }
    }

    private static User uploader() {
        User user = new User();
        user.setId(2L);
        user.setUsername("diak");
        return user;
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

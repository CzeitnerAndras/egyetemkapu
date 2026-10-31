package com.egyetemkapu.controller;

import com.egyetemkapu.dto.DocumentResponseDto;
import com.egyetemkapu.dto.DocumentSearchHitDto;
import com.egyetemkapu.model.Document;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.model.DocumentStatus;
import com.egyetemkapu.model.User;
import com.egyetemkapu.security.ClientIpResolver;
import com.egyetemkapu.security.JwtUtil;
import com.egyetemkapu.service.DocumentService;
import com.egyetemkapu.service.RateLimitingService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DocumentController.class)
@AutoConfigureMockMvc(addFilters = false)
class DocumentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DocumentService documentService;
    @MockitoBean
    private UserRepository userRepository;
    @MockitoBean
    private JwtUtil jwtUtil;
    @MockitoBean
    private RateLimitingService rateLimitingService;
    @MockitoBean
    private ClientIpResolver clientIpResolver;

    @TempDir
    Path tempDir;

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void uploadDocument_acceptsAValidFile() throws Exception {
        authenticate("anna");
        MockMultipartFile file = new MockMultipartFile("file", "jegyzet.pdf", "application/pdf", "pdf".getBytes());

        mockMvc.perform(multipart("/api/documents/upload")
                        .file(file)
                        .param("title", "Jegyzet")
                        .param("description", "Leírás")
                        .param("category", "Egyetem"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Sikeres feltöltés! Az admin jóváhagyása után lesz látható."));

        verify(documentService).uploadDocument(any(), eq("Jegyzet"), eq("Leírás"), eq("Egyetem"), eq("anna"));
    }

    @Test
    void uploadDocument_returnsTheValidationMessage() throws Exception {
        authenticate("anna");
        when(documentService.uploadDocument(any(), any(), any(), any(), any()))
                .thenThrow(new IllegalArgumentException("Csak PDF tölthető fel."));

        mockMvc.perform(multipart("/api/documents/upload")
                        .file(new MockMultipartFile("file", "x.txt", "text/plain", "x".getBytes()))
                        .param("title", "Jegyzet")
                        .param("description", "Leírás")
                        .param("category", "Egyetem"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Csak PDF tölthető fel."));
    }

    @Test
    void uploadDocument_hidesUnexpectedFailures() throws Exception {
        authenticate("anna");
        when(documentService.uploadDocument(any(), any(), any(), any(), any()))
                .thenThrow(new RuntimeException("disk"));

        mockMvc.perform(multipart("/api/documents/upload")
                        .file(new MockMultipartFile("file", "x.pdf", "application/pdf", "x".getBytes()))
                        .param("title", "Jegyzet")
                        .param("description", "Leírás")
                        .param("category", "Egyetem"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("A feltöltés nem sikerült."));
    }

    @Test
    void getApprovedDocuments_listsPublicDocuments() throws Exception {
        when(documentService.getApprovedDocuments("Egyetem")).thenReturn(List.of(storedDocument()));

        mockMvc.perform(get("/api/documents").param("category", "Egyetem"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Jegyzet"))
                .andExpect(jsonPath("$[0].status").value("APPROVED"))
                .andExpect(jsonPath("$[0].uploader.username").value("anna"));
    }

    @Test
    void searchDocuments_returnsRankedHits() throws Exception {
        when(documentService.searchApproved("kerdes", "Fizika")).thenReturn(List.of(
                new DocumentSearchHitDto(
                        3L,
                        "Kérdés",
                        "Rövid mondat.",
                        "Fizika",
                        "jegyzet.pdf",
                        LocalDateTime.of(2026, 3, 1, 10, 0),
                        new DocumentResponseDto.UploaderDto("anna"),
                        "A \u001EKérdés\u001F a tétel.")));

        mockMvc.perform(get("/api/documents/search").param("q", "kerdes").param("category", "Fizika"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Kérdés"))
                .andExpect(jsonPath("$[0].uploader.username").value("anna"))
                .andExpect(jsonPath("$[0].snippet", containsString("Kérdés")));
    }

    @Test
    void downloadDocument_sendsTheFile() throws Exception {
        when(documentService.getApprovedDocument(3L)).thenReturn(storedDocument());

        mockMvc.perform(get("/api/documents/download/3"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("jegyzet.pdf")))
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_OCTET_STREAM_VALUE));
    }

    @Test
    void downloadDocument_missingDocumentReturns404() throws Exception {
        when(documentService.getApprovedDocument(9L)).thenThrow(new IllegalArgumentException("nincs"));

        mockMvc.perform(get("/api/documents/download/9"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getPendingDocuments_listsDocumentsWaitingForReview() throws Exception {
        Document pending = storedDocument();
        pending.setStatus(DocumentStatus.PENDING);
        when(documentService.getPendingDocuments()).thenReturn(List.of(pending));

        mockMvc.perform(get("/api/documents/admin/pending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    void approveDocument_confirmsTheDecision() throws Exception {
        mockMvc.perform(put("/api/documents/admin/3/approve"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Dokumentum elfogadva!"));

        verify(documentService).approveDocument(3L);
    }

    @Test
    void rejectDocument_confirmsTheDeletion() throws Exception {
        mockMvc.perform(delete("/api/documents/admin/3/reject"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Dokumentum elutasítva és törölve!"));

        verify(documentService).rejectDocument(3L);
    }

    @Test
    void downloadDocumentForReview_missingFileReturns404() throws Exception {
        Document document = storedDocument();
        document.setFilePath(tempDir.resolve("nincs.pdf").toString());
        when(documentService.getDocumentForAdminDownload(3L)).thenReturn(document);

        mockMvc.perform(get("/api/documents/admin/3/download"))
                .andExpect(status().isNotFound());
    }

    private Document storedDocument() throws Exception {
        Path file = tempDir.resolve("jegyzet.pdf");
        Files.writeString(file, "pdf");
        User uploader = new User();
        uploader.setUsername("anna");
        Document document = new Document();
        document.setId(3L);
        document.setTitle("Jegyzet");
        document.setDescription("Leírás");
        document.setCategory("Egyetem");
        document.setFileName("jegyzet.pdf");
        document.setFilePath(file.toString());
        document.setStatus(DocumentStatus.APPROVED);
        document.setUploader(uploader);
        document.setCreatedAt(LocalDateTime.of(2026, 1, 2, 3, 4));
        return document;
    }

    private static void authenticate(String username) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(username, null, List.of()));
    }
}

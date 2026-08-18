package com.egyetemkapu.controller;

import com.egyetemkapu.model.Document;
import com.egyetemkapu.service.DocumentService;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
@CrossOrigin
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    // --- FELHASZNÁLÓI VÉGPONTOK ---

    @PostMapping("/upload")
    public ResponseEntity<?> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam("description") String description,
            @RequestParam("category") String category) {
        
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            Document savedDoc = documentService.uploadDocument(file, title, description, category, username);
            return ResponseEntity.ok(Map.of("message", "Sikeres feltöltés! Az admin jóváhagyása után lesz látható."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<List<Document>> getApprovedDocuments(@RequestParam(required = false) String category) {
        return ResponseEntity.ok(documentService.getApprovedDocuments(category));
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<Resource> downloadDocument(@PathVariable Long id) {
        try {
            Path filePath = documentService.getDocumentPath(id);
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() || resource.isReadable()) {
                return ResponseEntity.ok()
                        .contentType(MediaType.APPLICATION_OCTET_STREAM)
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename().substring(37) + "\"") // Levágjuk a UUID-t
                        .body(resource);
            } else {
                throw new RuntimeException("Fájl nem olvasható");
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // --- ADMIN VÉGPONTOK ---

    @GetMapping("/admin/pending")
    public ResponseEntity<List<Document>> getPendingDocuments() {
        return ResponseEntity.ok(documentService.getPendingDocuments());
    }

    @PutMapping("/admin/{id}/approve")
    public ResponseEntity<?> approveDocument(@PathVariable Long id) {
        documentService.approveDocument(id);
        return ResponseEntity.ok(Map.of("message", "Dokumentum elfogadva!"));
    }

    @DeleteMapping("/admin/{id}/reject")
    public ResponseEntity<?> rejectDocument(@PathVariable Long id) {
        documentService.rejectDocument(id);
        return ResponseEntity.ok(Map.of("message", "Dokumentum elutasítva és törölve!"));
    }
}
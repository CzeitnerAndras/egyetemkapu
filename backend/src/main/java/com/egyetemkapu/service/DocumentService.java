package com.egyetemkapu.service;

import com.egyetemkapu.model.Document;
import com.egyetemkapu.model.DocumentStatus;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.DocumentRepository;
import com.egyetemkapu.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;

    private final Path uploadRoot = Paths.get("uploads").toAbsolutePath().normalize();

    public DocumentService(DocumentRepository documentRepository, UserRepository userRepository) {
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;

        try {
            Files.createDirectories(uploadRoot);
        } catch (IOException e) {
            throw new IllegalStateException("Nem sikerült létrehozni az uploads mappát", e);
        }
    }

    private String sanitizeFileName(String originalFileName) {
        String name = originalFileName == null || originalFileName.isBlank() ? "file" : originalFileName;
        name = Paths.get(name).getFileName().toString();
        name = name.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (name.isBlank() || name.equals(".") || name.equals("..")) {
            name = "file";
        }
        return name;
    }

    @Transactional(rollbackFor = Exception.class)
    public Document uploadDocument(MultipartFile file, String title, String description, String category, String username) throws IOException {
        User uploader = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Felhasználó nem található"));

        String originalFileName = sanitizeFileName(file.getOriginalFilename());
        String uniqueFileName = UUID.randomUUID() + "_" + originalFileName;
        Path filePath = uploadRoot.resolve(uniqueFileName).normalize();

        if (!filePath.startsWith(uploadRoot)) {
            throw new RuntimeException("Érvénytelen fájlnév");
        }

        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        Document document = new Document();
        document.setTitle(title);
        document.setDescription(description);
        document.setCategory(category);
        document.setFileName(originalFileName);
        document.setFilePath(filePath.toString());
        document.setUploader(uploader);
        document.setStatus(DocumentStatus.PENDING);

        return documentRepository.save(document);
    }

    @Transactional(readOnly = true)
    public List<Document> getApprovedDocuments(String category) {
        if (category != null && !category.isEmpty()) {
            return documentRepository.findByCategoryAndStatusOrderByCreatedAtDesc(category, DocumentStatus.APPROVED);
        }
        return documentRepository.findByStatusOrderByCreatedAtDesc(DocumentStatus.APPROVED);
    }

    @Transactional(readOnly = true)
    public List<Document> getPendingDocuments() {
        return documentRepository.findByStatusOrderByCreatedAtDesc(DocumentStatus.PENDING);
    }

    @Transactional
    public Document approveDocument(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Dokumentum nem található"));
        document.setStatus(DocumentStatus.APPROVED);
        return documentRepository.save(document);
    }

    @Transactional
    public void rejectDocument(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Dokumentum nem található"));

        File file = new File(document.getFilePath());
        if (file.exists()) file.delete();

        documentRepository.delete(document);
    }

    @Transactional(readOnly = true)
    public Document getApprovedDocument(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Dokumentum nem található"));

        if (document.getStatus() != DocumentStatus.APPROVED) {
            throw new RuntimeException("A dokumentum még nem érhető el letöltésre");
        }

        Path filePath = Paths.get(document.getFilePath()).toAbsolutePath().normalize();
        if (!filePath.startsWith(uploadRoot)) {
            throw new RuntimeException("Érvénytelen fájlútvonal");
        }
        return document;
    }

    @Transactional(readOnly = true)
    public Path getDocumentPath(Long id) {
        return Paths.get(getApprovedDocument(id).getFilePath());
    }
}

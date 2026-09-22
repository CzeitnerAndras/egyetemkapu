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
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class DocumentService {

    static final long MAX_UPLOAD_BYTES = 10L * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "jpg", "jpeg", "png");
    private static final byte[] PDF_MAGIC = {0x25, 0x50, 0x44, 0x46};
    private static final byte[] PNG_MAGIC = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] JPEG_MAGIC = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};

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

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Üres fájl nem tölthető fel");
        }
        if (file.getSize() > MAX_UPLOAD_BYTES) {
            throw new IllegalArgumentException("A fájl maximum 10 MB lehet");
        }

        String originalFileName = sanitizeFileName(file.getOriginalFilename());
        byte[] content = file.getBytes();
        if (content.length > MAX_UPLOAD_BYTES) {
            throw new IllegalArgumentException("A fájl maximum 10 MB lehet");
        }
        if (!isAllowedUpload(originalFileName, content)) {
            throw new IllegalArgumentException("Csak PDF, JPEG vagy PNG fájl tölthető fel");
        }

        String uniqueFileName = UUID.randomUUID() + "_" + originalFileName;
        Path filePath = uploadRoot.resolve(uniqueFileName).normalize();

        if (!filePath.startsWith(uploadRoot)) {
            throw new RuntimeException("Érvénytelen fájlnév");
        }

        Files.write(filePath, content);

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

    static boolean isAllowedUpload(String fileName, byte[] content) {
        if (fileName == null || content == null || content.length == 0) {
            return false;
        }
        String extension = extensionOf(fileName);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            return false;
        }
        if ("pdf".equals(extension)) {
            return startsWith(content, PDF_MAGIC);
        }
        if ("png".equals(extension)) {
            return startsWith(content, PNG_MAGIC);
        }
        return startsWith(content, JPEG_MAGIC);
    }

    private static String extensionOf(String fileName) {
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private static boolean startsWith(byte[] content, byte[] magic) {
        if (content.length < magic.length) {
            return false;
        }
        for (int i = 0; i < magic.length; i++) {
            if (content[i] != magic[i]) {
                return false;
            }
        }
        return true;
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
        return getDocumentForDownload(id, false);
    }

    @Transactional(readOnly = true)
    public Document getDocumentForAdminDownload(Long id) {
        return getDocumentForDownload(id, true);
    }

    @Transactional(readOnly = true)
    public Path getDocumentPath(Long id) {
        return Paths.get(getApprovedDocument(id).getFilePath());
    }

    private Document getDocumentForDownload(Long id, boolean includePending) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Dokumentum nem található"));

        boolean allowed = document.getStatus() == DocumentStatus.APPROVED
                || (includePending && document.getStatus() == DocumentStatus.PENDING);
        if (!allowed) {
            throw new RuntimeException("A dokumentum még nem érhető el letöltésre");
        }

        Path filePath = Paths.get(document.getFilePath()).toAbsolutePath().normalize();
        if (!filePath.startsWith(uploadRoot)) {
            throw new RuntimeException("Érvénytelen fájlútvonal");
        }
        return document;
    }
}

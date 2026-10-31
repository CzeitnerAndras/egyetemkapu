package com.egyetemkapu.service;

import com.egyetemkapu.dto.DocumentSearchHitDto;
import com.egyetemkapu.model.Document;
import com.egyetemkapu.model.DocumentStatus;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.DocumentRepository;
import com.egyetemkapu.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = "spring.task.scheduling.enabled=false")
@Transactional
class DocumentSearchTest {

    private static final String MARK = "\u001E";

    @Autowired
    private DocumentService documentService;
    @Autowired
    private DocumentRepository documentRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private EntityManager entityManager;

    @Test
    void searchFoldsAccentsStemsPluralsRanksTitleFirstAndSkipsTheRest() {
        User uploader = userRepository.save(user());
        save(uploader, "Kérdés", "Rövid mondat a tételről.", "Fizika", DocumentStatus.APPROVED);
        save(uploader, "Jegyzet", "A lap végén állnak a kérdések, a cím más.", "Fizika", DocumentStatus.APPROVED);
        save(uploader, "Alma", "Gyümölcs a kertben.", "Gazdaság", DocumentStatus.APPROVED);
        save(uploader, "Titkos kérdés", "Még nincs jóváhagyva.", "Fizika", DocumentStatus.PENDING);
        entityManager.flush();
        entityManager.clear();

        List<String> folded = titles(documentService.searchApproved("kerdes", null));
        assertEquals(List.of("Kérdés", "Jegyzet"), folded);

        List<DocumentSearchHitDto> plural = documentService.searchApproved("kérdések", "Fizika");
        assertEquals(List.of("Kérdés", "Jegyzet"), titles(plural));
        assertTrue(plural.get(0).snippet().contains(MARK));
        assertFalse(plural.stream().anyMatch(hit -> hit.title().contains("Titkos")));
        assertFalse(plural.stream().anyMatch(hit -> hit.title().equals("Alma")));

        assertEquals(List.of("Alma"), titles(documentService.searchApproved("alma", null)));
        assertTrue(documentService.searchApproved("kerdes", "Gazdaság").isEmpty());
    }

    private static List<String> titles(List<DocumentSearchHitDto> hits) {
        return hits.stream().map(DocumentSearchHitDto::title).toList();
    }

    private void save(User uploader, String title, String description, String category, DocumentStatus status) {
        Document document = new Document();
        document.setTitle(title);
        document.setDescription(description);
        document.setCategory(category);
        document.setFileName("jegyzet.pdf");
        document.setFilePath("uploads/document-search-test.pdf");
        document.setUploader(uploader);
        document.setStatus(status);
        documentRepository.save(document);
    }

    private static User user() {
        User user = new User();
        user.setUsername("kb-search");
        user.setEmail("kb-search@egyetemkapu.hu");
        user.setPassword("secret");
        user.setRole("ROLE_USER");
        return user;
    }
}

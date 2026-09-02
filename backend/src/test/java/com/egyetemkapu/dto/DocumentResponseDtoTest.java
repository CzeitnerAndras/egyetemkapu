package com.egyetemkapu.dto;

import com.egyetemkapu.model.Document;
import com.egyetemkapu.model.DocumentStatus;
import com.egyetemkapu.model.User;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DocumentResponseDtoTest {

    @Test
    void mapsUsernameOnlyFromUploader() {
        User uploader = new User();
        uploader.setUsername("Bandi");
        uploader.setEmail("secret@example.com");
        uploader.setRole("ROLE_ADMIN");
        uploader.setFailedLoginAttempts(3);

        Document document = new Document();
        document.setId(1L);
        document.setTitle("Tételsor");
        document.setDescription("Záróvizsga");
        document.setCategory("Informatika");
        document.setFileName("tetelek.pdf");
        document.setFilePath("/secret/uploads/tetelek.pdf");
        document.setStatus(DocumentStatus.APPROVED);
        document.setUploader(uploader);

        DocumentResponseDto dto = DocumentResponseDto.from(document);

        assertEquals("Bandi", dto.uploader().username());
        assertEquals("Tételsor", dto.title());
        assertEquals("APPROVED", dto.status());
        assertEquals("tetelek.pdf", dto.fileName());
    }
}

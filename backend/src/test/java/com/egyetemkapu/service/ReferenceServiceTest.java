package com.egyetemkapu.service;

import com.egyetemkapu.dto.ReferenceRequestDto;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ReferenceServiceTest {

    private final ReferenceService service = new ReferenceService();

    private ReferenceRequestDto request(String style) {
        ReferenceRequestDto dto = new ReferenceRequestDto();
        dto.setAuthor("Gipsz Jakab");
        dto.setTitle("A nagy tesztkönyv");
        dto.setYear("2024");
        dto.setPublisher("Teszt Kiadó");
        dto.setStyle(style);
        return dto;
    }

    @Test
    void formatsApaMlaAndHarvard() {
        assertEquals(
                "Gipsz Jakab. (2024). A nagy tesztkönyv. Teszt Kiadó.",
                service.generateReference(request("APA")));
        assertEquals(
                "Gipsz Jakab. \"A nagy tesztkönyv.\" Teszt Kiadó, 2024.",
                service.generateReference(request("mla")));
        assertEquals(
                "Gipsz Jakab, 2024. A nagy tesztkönyv. Teszt Kiadó.",
                service.generateReference(request("Harvard")));
    }

    @Test
    void usesDefaultsAndRejectsUnknownStyle() {
        ReferenceRequestDto empty = new ReferenceRequestDto();

        assertEquals(
                "Ismeretlen szerző. (é.n.). Cím nélkül. Kiadó nélkül.",
                service.generateReference(empty));
        assertTrue(service.generateReference(request("chicago")).contains("Ismeretlen hivatkozási stílus"));
    }
}

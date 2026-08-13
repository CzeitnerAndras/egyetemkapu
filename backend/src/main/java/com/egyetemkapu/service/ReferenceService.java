package com.egyetemkapu.service;

import com.egyetemkapu.dto.ReferenceRequestDto;
import org.springframework.stereotype.Service;

@Service
public class ReferenceService {

    public String generateReference(ReferenceRequestDto dto) {
        String author = dto.getAuthor() != null ? dto.getAuthor() : "Ismeretlen szerző";
        String title = dto.getTitle() != null ? dto.getTitle() : "Cím nélkül";
        String year = dto.getYear() != null ? dto.getYear() : "é.n.";
        String publisher = dto.getPublisher() != null ? dto.getPublisher() : "Kiadó nélkül";
        String style = dto.getStyle() != null ? dto.getStyle().toUpperCase() : "APA";

        return switch (style) {
            case "MLA" -> String.format("%s. \"%s.\" %s, %s.", author, title, publisher, year);
            case "HARVARD" -> String.format("%s, %s. %s. %s.", author, year, title, publisher);
            case "APA" -> String.format("%s. (%s). %s. %s.", author, year, title, publisher);
            default -> "Ismeretlen hivatkozási stílus. Kérlek válassz az APA, MLA vagy HARVARD közül.";
        };
    }
}
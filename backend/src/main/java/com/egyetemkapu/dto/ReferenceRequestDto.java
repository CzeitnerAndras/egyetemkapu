package com.egyetemkapu.dto;

import lombok.Data;

@Data
public class ReferenceRequestDto {
    private String author;
    private String title;
    private String year;
    private String publisher;
    private String style;
}
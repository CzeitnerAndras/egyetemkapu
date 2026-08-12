package com.egyetemkapu.controller;

import com.egyetemkapu.dto.ReferenceRequestDto;
import com.egyetemkapu.service.ReferenceService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/tools/reference")
@CrossOrigin
public class ReferenceController {

    private final ReferenceService referenceService;

    public ReferenceController(ReferenceService referenceService) {
        this.referenceService = referenceService;
    }

    @PostMapping("/generate")
    public Map<String, String> generate(@RequestBody ReferenceRequestDto request) {
        String formattedReference = referenceService.generateReference(request);
        return Map.of(
                "style", request.getStyle().toUpperCase(),
                "reference", formattedReference
        );
    }
}
package com.egyetemkapu.controller;

import com.egyetemkapu.dto.SubjectResultDto;
import com.egyetemkapu.service.CreditCalculatorService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/calculator")
@CrossOrigin
public class CreditCalculatorController {

    private final CreditCalculatorService calculatorService;

    public CreditCalculatorController(CreditCalculatorService calculatorService) {
        this.calculatorService = calculatorService;
    }

    @PostMapping("/weighted-average")
    public Map<String, Object> calculate(@RequestBody List<SubjectResultDto> subjects) {
        double average = calculatorService.calculateWeightedAverage(subjects);
        double roundedAverage = Math.round(average * 100.0) / 100.0;

        return Map.of(
                "average", roundedAverage,
                "message", "Sikeresen kiszámítva!"
        );
    }
}
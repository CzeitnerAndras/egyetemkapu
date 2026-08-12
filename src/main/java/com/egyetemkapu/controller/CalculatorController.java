package com.egyetemkapu.controller;

import com.egyetemkapu.service.CalculatorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/tools/calculator")
@CrossOrigin
public class CalculatorController {

    private final CalculatorService calculatorService;

    public CalculatorController(CalculatorService calculatorService) {
        this.calculatorService = calculatorService;
    }

    @GetMapping("/{operation}/{expression}")
    public ResponseEntity<Map<String, Object>> calculateExternal(
            @PathVariable String operation,
            @PathVariable String expression) {

        return ResponseEntity.ok(calculatorService.calculateComplex(operation, expression));
    }
}
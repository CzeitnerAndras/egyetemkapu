package com.egyetemkapu.controller;

import com.egyetemkapu.annotation.LogAction;
import com.egyetemkapu.service.CalculatorService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
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
    @LogAction("Komplex számológép hívás")
    public ResponseEntity<Map<String, Object>> calculateExternal(
            @PathVariable String operation,
            @PathVariable String expression,
            Principal principal) {

        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Bejelentkezés szükséges a számológép használatához!"));
        }

        String username = principal.getName();
        return ResponseEntity.ok(calculatorService.calculateComplex(operation, expression, username));
    }
}
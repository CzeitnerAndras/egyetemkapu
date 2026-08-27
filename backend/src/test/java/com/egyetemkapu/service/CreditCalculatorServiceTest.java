package com.egyetemkapu.service;

import com.egyetemkapu.dto.SubjectResultDto;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Arrays;
import java.util.List;

class CreditCalculatorServiceTest {

    private final CreditCalculatorService calculatorService = new CreditCalculatorService();

    @Test
    void testCalculateWeightedAverage_SuccessfulCalculation() {
        SubjectResultDto subject1 = new SubjectResultDto();
        subject1.setCredit(5);
        subject1.setGrade(4);

        SubjectResultDto subject2 = new SubjectResultDto();
        subject2.setCredit(3);
        subject2.setGrade(5);

        List<SubjectResultDto> subjects = Arrays.asList(subject1, subject2);

        double result = calculatorService.calculateWeightedAverage(subjects);
        assertEquals(4.375, result, 0.001, "A súlyozott átlagnak 4.375-nek kell lennie");
    }

    @Test
    void testCalculateWeightedAverage_EmptyList_ReturnsZero() {
        List<SubjectResultDto> subjects = List.of();
        double result = calculatorService.calculateWeightedAverage(subjects);
        assertEquals(0.0, result, "Üres lista esetén az átlagnak 0-nak kell lennie");
    }
}
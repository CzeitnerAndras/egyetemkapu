package com.egyetemkapu.service;

import com.egyetemkapu.dto.SubjectResultDto;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CreditCalculatorService {

    public double calculateWeightedAverage(List<SubjectResultDto> subjects) {
        if (subjects == null || subjects.isEmpty()) {
            return 0.0;
        }

        int totalCredits = 0;
        int totalWeightedScore = 0;

        for (SubjectResultDto subject : subjects) {
            totalCredits += subject.getCredit();
            totalWeightedScore += (subject.getCredit() * subject.getGrade());
        }

        if (totalCredits == 0) {
            return 0.0;
        }

        return (double) totalWeightedScore / totalCredits;
    }
}
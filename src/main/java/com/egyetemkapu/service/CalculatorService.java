package com.egyetemkapu.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.Map;

@Service
public class CalculatorService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String apiUrl = "https://newton.vercel.app/api/v2";

    public Map<String, Object> calculateComplex(String operation, String expression) {
        try {
            String url = apiUrl + "/{operation}/{expression}";

            return restTemplate.getForObject(url, Map.class, operation, expression);
        } catch (Exception e) {
            return Map.of("error", "Hiba a külső matematikai API hívásakor: " + e.getMessage());
        }
    }
}
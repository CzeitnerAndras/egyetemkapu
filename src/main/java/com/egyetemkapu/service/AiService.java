package com.egyetemkapu.service;

import com.egyetemkapu.model.PromptLog;
import com.egyetemkapu.repository.PromptLogRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class AiService {

    private final PromptLogRepository promptLogRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${AI_API_KEY:nincs_megadva}")
    private String aiApiKey;

    private final String aiApiUrl = "https://api.groq.com/openai/v1/chat/completions";

    public AiService(PromptLogRepository promptLogRepository) {
        this.promptLogRepository = promptLogRepository;
    }

    public String askAi(String userPrompt) {
        //Biztonsági ellenőrzés
        if ("nincs_megadva".equals(aiApiKey)) {
            System.out.println("AI API kulcs nincs beállítva!");
            return "Hiányzik az API kulcs.";
        }

        try {
            //HTTP Fejlécek beállítása a hitelesítéshez
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(aiApiKey);

            //Kérés összeállítása
            Map<String, Object> requestBody = Map.of(
                    "model", "llama-3.3-70b-versatile",
                    "messages", List.of(
                            Map.of("role", "system", "content", "Te egy segítőkész, barátságos egyetemi asszisztens vagy. Válaszolj röviden és lényegretörően."),
                            Map.of("role", "user", "content", userPrompt)
                    )
            );

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            //Hálózati hívás indítása
            ResponseEntity<Map> response = restTemplate.postForEntity(aiApiUrl, entity, Map.class);

            //Kibontás a JSON-ből
            Map<String, Object> responseBody = response.getBody();
            List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            String aiAnswer = (String) message.get("content");

            //Naplózás
            PromptLog log = new PromptLog();
            log.setPrompt(userPrompt);
            log.setResponse(aiAnswer);
            promptLogRepository.save(log);

            return aiAnswer;

        } catch (Exception e) {
            System.out.println("Hiba történt az AI hívás során: " + e.getMessage());
            return "Hiba a serveren. Próbáld újra később!";
        }
    }
}
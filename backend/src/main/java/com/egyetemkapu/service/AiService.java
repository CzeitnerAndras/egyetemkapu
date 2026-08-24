package com.egyetemkapu.service;

import com.egyetemkapu.model.PromptLog;
import com.egyetemkapu.repository.PromptLogRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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

    @SuppressWarnings("unchecked")
    public String askAi(String userPrompt) {
        if ("nincs_megadva".equals(aiApiKey)) {
            System.out.println("AI API kulcs nincs beállítva!");
            return "Hiányzik az API kulcs.";
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(aiApiKey);

            Map<String, Object> requestBody = Map.of(
                    "model", "openai/gpt-oss-120b",
                    "messages", List.of(
                            Map.of("role", "system", "content", "Te egy segítőkész, barátságos egyetemi asszisztens vagy. Válaszolj röviden és lényegretörően."),
                            Map.of("role", "user", "content", userPrompt)
                    )
            );

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            Map<String, Object> responseBody = (Map<String, Object>) restTemplate.postForEntity(aiApiUrl, entity, Map.class).getBody();

            if (responseBody != null) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                String aiAnswer = (String) message.get("content");

                PromptLog log = new PromptLog();
                log.setPrompt(userPrompt);
                log.setResponse(aiAnswer);
                promptLogRepository.save(log);

                return aiAnswer;
            }
            return "Üres válasz érkezett az AI-tól.";

        } catch (Exception e) {
            System.out.println("Hiba történt az AI hívás során: " + e.getMessage());
            return "Hiba a serveren. Próbáld újra később!";
        }
    }
}
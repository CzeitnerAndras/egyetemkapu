package com.egyetemkapu.service;
import io.github.bucket4j.Bucket;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.Map;

@Service
public class CalculatorService {

    private static final Logger log = LoggerFactory.getLogger(CalculatorService.class);

    private final RestTemplate restTemplate = new RestTemplate();
    private final String apiUrl = "https://newton.vercel.app/api/v2";
    private final RateLimitingService rateLimitingService;

    public CalculatorService(RateLimitingService rateLimitingService) {
        this.rateLimitingService = rateLimitingService;
    }

    @SuppressWarnings("unchecked")
    // --- Newton API ---
    public Map<String, Object> calculateComplex(String operation, String expression, String username) {
        Bucket bucket = rateLimitingService.resolveBucket("math_" + username);

        if (bucket.tryConsume(1)) {
            try {
                String url = apiUrl + "/{operation}/{expression}";
                return restTemplate.getForObject(url, Map.class, operation, expression);
            } catch (Exception e) {
                log.warn("Matematikai API hívás sikertelen", e);
                return Map.of("error", "Hiba a külső matematikai API hívásakor.");
            }
        } else {
            return Map.of("error", "Túl sok számítási kérés! Kérlek, várj egy percet a következőig.");
        }
    }
}
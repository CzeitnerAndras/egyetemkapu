package com.egyetemkapu.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class RecaptchaService {

    static final String VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

    private final RestTemplate restTemplate;
    private final String secret;
    private final String siteKey;

    public RecaptchaService(
            RestTemplate restTemplate,
            @Value("${recaptcha.secret-key:}") String secret,
            @Value("${recaptcha.site-key:}") String siteKey) {
        this.restTemplate = restTemplate;
        this.secret = secret == null ? "" : secret;
        this.siteKey = siteKey == null ? "" : siteKey;
    }

    public String siteKey() {
        return siteKey;
    }

    public boolean verify(String token, String remoteIp) {
        if (secret.isBlank() || token == null || token.isBlank()) {
            return false;
        }
        try {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("secret", secret);
            form.add("response", token);
            if (remoteIp != null && !remoteIp.isBlank()) {
                form.add("remoteip", remoteIp);
            }
            ResponseEntity<Map> response = restTemplate.postForEntity(VERIFY_URL, form, Map.class);
            Object success = response.getBody() == null ? null : response.getBody().get("success");
            return Boolean.TRUE.equals(success);
        } catch (RestClientException e) {
            return false;
        }
    }
}

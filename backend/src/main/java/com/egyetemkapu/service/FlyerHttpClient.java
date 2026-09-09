package com.egyetemkapu.service;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.List;

@Component
public class FlyerHttpClient {

    private static final String USER_AGENT =
            "Egyetemkapu/1.0 (+https://egyetemkapu.hu; student flyer search)";

    private final RestTemplate restTemplate;

    public FlyerHttpClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(12_000);
        factory.setReadTimeout(25_000);
        this.restTemplate = new RestTemplate(factory);
    }

    public FlyerHttpClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String getText(String url) {
        ResponseEntity<String> response = restTemplate.exchange(
                URI.create(url), HttpMethod.GET, entity(MediaType.TEXT_HTML, MediaType.APPLICATION_JSON, MediaType.ALL), String.class);
        return response.getBody() == null ? "" : response.getBody();
    }

    public byte[] getBytes(String url) {
        ResponseEntity<byte[]> response = restTemplate.exchange(
                URI.create(url), HttpMethod.GET, entity(MediaType.APPLICATION_PDF, MediaType.IMAGE_JPEG, MediaType.IMAGE_PNG, MediaType.ALL), byte[].class);
        return response.getBody() == null ? new byte[0] : response.getBody();
    }

    public ResponseEntity<byte[]> getBytesWithHeaders(String url) {
        return getBytesWithHeaders(url, null);
    }

    public ResponseEntity<byte[]> getBytesWithHeaders(String url, String referer) {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.USER_AGENT, USER_AGENT);
        headers.setAccept(List.of(MediaType.IMAGE_JPEG, MediaType.IMAGE_PNG, MediaType.ALL));
        if (referer != null && !referer.isBlank()) {
            headers.set(HttpHeaders.REFERER, referer);
        }
        return restTemplate.exchange(URI.create(url), HttpMethod.GET, new HttpEntity<>(headers), byte[].class);
    }

    private HttpEntity<Void> entity(MediaType... accept) {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.USER_AGENT, USER_AGENT);
        headers.setAccept(List.of(accept));
        return new HttpEntity<>(headers);
    }
}

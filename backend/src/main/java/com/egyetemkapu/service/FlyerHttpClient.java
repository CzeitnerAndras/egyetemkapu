package com.egyetemkapu.service;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class FlyerHttpClient {

    private static final String USER_AGENT =
            "Egyetemkapu/1.0 (+https://egyetemkapu.hu; student flyer search)";
    private static final String TESCO_BROWSER_UA =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/172.16.1.3 Safari/537.36";

    private final RestTemplate restTemplate;

    public FlyerHttpClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(12_000);
        factory.setReadTimeout(60_000);
        this.restTemplate = new RestTemplate(factory);
        useUtf8ForText(this.restTemplate);
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
        return getBytes(url, null);
    }

    public byte[] getBytes(String url, String referer) {
        ResponseEntity<byte[]> response = getBytesWithHeaders(url, referer);
        return response.getBody() == null ? new byte[0] : response.getBody();
    }

    public String postJson(String url, String body) {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.USER_AGENT, USER_AGENT);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON, MediaType.ALL));
        headers.set(HttpHeaders.ORIGIN, "https://www.tesco.hu");
        headers.set(HttpHeaders.REFERER, "https://www.tesco.hu/akciok/katalogusok");
        headers.set("apollographql-client-name", "customer-leaflets-fe");
        ResponseEntity<String> response = restTemplate.exchange(
                URI.create(url), HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
        return response.getBody() == null ? "" : response.getBody();
    }

    public ResponseEntity<byte[]> getBytesWithHeaders(String url) {
        return getBytesWithHeaders(url, null);
    }

    public ResponseEntity<byte[]> getBytesWithHeaders(String url, String referer) {
        HttpHeaders headers = new HttpHeaders();
        boolean tesco = tescoHost(url) || tescoHost(referer);
        headers.set(HttpHeaders.USER_AGENT, tesco ? TESCO_BROWSER_UA : USER_AGENT);
        headers.setAccept(List.of(MediaType.IMAGE_JPEG, MediaType.IMAGE_PNG, MediaType.APPLICATION_PDF, MediaType.ALL));
        if (tesco) {
            headers.set(HttpHeaders.ACCEPT_LANGUAGE, "hu-HU,hu;q=0.9,en;q=0.8");
            headers.set(HttpHeaders.ORIGIN, "https://www.tesco.hu");
        }
        if (referer != null && !referer.isBlank()) {
            headers.set(HttpHeaders.REFERER, referer);
        } else if (tesco) {
            headers.set(HttpHeaders.REFERER, "https://www.tesco.hu/akciok/katalogusok");
        }
        return restTemplate.exchange(URI.create(url), HttpMethod.GET, new HttpEntity<>(headers), byte[].class);
    }

    private static boolean tescoHost(String value) {
        if (value == null) {
            return false;
        }
        String lower = value.toLowerCase();
        return lower.contains("tesco.hu") || lower.contains("tesco.com");
    }

    /**
     * PENNY's leaflet host serves UTF-8 without a charset parameter, and the HTTP default of
     * ISO-8859-1 mangles exactly the two letters that are not Latin-1 (Ő and Ű). Product names such as
     * "VATTACUKOR ÍZŰ FEHÉR SZŐLŐ" then break apart mid-word.
     */
    private static void useUtf8ForText(RestTemplate template) {
        template.getMessageConverters().replaceAll(converter ->
                converter instanceof StringHttpMessageConverter
                        ? new StringHttpMessageConverter(StandardCharsets.UTF_8)
                        : converter);
    }

    private HttpEntity<Void> entity(MediaType... accept) {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.USER_AGENT, USER_AGENT);
        headers.setAccept(List.of(accept));
        return new HttpEntity<>(headers);
    }
}

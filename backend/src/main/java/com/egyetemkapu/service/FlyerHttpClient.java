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

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class FlyerHttpClient {

    private static final String USER_AGENT =
            "Egyetemkapu/1.0 (+https://egyetemkapu.hu; student flyer search)";
    private static final String BROWSER_UA =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/172.16.1.3 Safari/537.36";

    private final RestTemplate restTemplate;

    public FlyerHttpClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory() {
            @Override
            protected void prepareConnection(HttpURLConnection connection, String httpMethod) throws IOException {
                super.prepareConnection(connection, httpMethod);
                connection.setInstanceFollowRedirects(false);
            }
        };
        factory.setConnectTimeout(12_000);
        factory.setReadTimeout(180_000);
        this.restTemplate = new RestTemplate(factory);
        useUtf8ForText(this.restTemplate);
    }

    public FlyerHttpClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String getText(String url) {
        HttpHeaders headers = new HttpHeaders();
        boolean spar = sparHost(url);
        headers.set(HttpHeaders.USER_AGENT, spar ? BROWSER_UA : USER_AGENT);
        headers.setAccept(List.of(MediaType.TEXT_HTML, MediaType.APPLICATION_JSON, MediaType.ALL));
        if (spar) {
            headers.set(HttpHeaders.ACCEPT_LANGUAGE, "hu-HU,hu;q=0.9,en;q=0.8");
            headers.set(HttpHeaders.REFERER, "https://www.spar.hu/");
        }
        ResponseEntity<String> response = getFollowingRedirects(
                url, new HttpEntity<>(headers), String.class);
        String body = response.getBody() == null ? "" : response.getBody();
        return body.length() <= FlyerUrlPolicy.MAX_TEXT_CHARS
                ? body
                : body.substring(0, FlyerUrlPolicy.MAX_TEXT_CHARS);
    }

    public byte[] getBytes(String url) {
        return getBytes(url, null);
    }

    public byte[] getBytes(String url, String referer) {
        ResponseEntity<byte[]> response = getBytesWithHeaders(url, referer);
        return response.getBody() == null ? new byte[0] : response.getBody();
    }

    public String postJson(String url, String body) {
        FlyerUrlPolicy.assertAllowed(url);
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.USER_AGENT, USER_AGENT);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON, MediaType.ALL));
        headers.set(HttpHeaders.ORIGIN, "https://www.tesco.hu");
        headers.set(HttpHeaders.REFERER, "https://www.tesco.hu/akciok/katalogusok");
        headers.set("apollographql-client-name", "customer-leaflets-fe");
        ResponseEntity<String> response = restTemplate.exchange(
                URI.create(url), HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
        if (response.getStatusCode().is3xxRedirection()) {
            throw new IllegalArgumentException("Ez a forrás nem engedélyezett.");
        }
        String text = response.getBody() == null ? "" : response.getBody();
        return text.length() <= FlyerUrlPolicy.MAX_TEXT_CHARS
                ? text
                : text.substring(0, FlyerUrlPolicy.MAX_TEXT_CHARS);
    }

    public ResponseEntity<byte[]> getBytesWithHeaders(String url) {
        return getBytesWithHeaders(url, null);
    }

    public ResponseEntity<byte[]> getBytesWithHeaders(String url, String referer) {
        HttpHeaders headers = new HttpHeaders();
        boolean tesco = tescoHost(url) || tescoHost(referer);
        boolean spar = sparHost(url) || sparHost(referer);
        headers.set(HttpHeaders.USER_AGENT, tesco || spar ? BROWSER_UA : USER_AGENT);
        headers.setAccept(List.of(MediaType.IMAGE_JPEG, MediaType.IMAGE_PNG, MediaType.APPLICATION_PDF, MediaType.ALL));
        if (tesco) {
            headers.set(HttpHeaders.ACCEPT_LANGUAGE, "hu-HU,hu;q=0.9,en;q=0.8");
            headers.set(HttpHeaders.ORIGIN, "https://www.tesco.hu");
        }
        if (referer != null && !referer.isBlank()) {
            headers.set(HttpHeaders.REFERER, referer);
        } else if (tesco) {
            headers.set(HttpHeaders.REFERER, "https://www.tesco.hu/akciok/katalogusok");
        } else if (spar) {
            headers.set(HttpHeaders.REFERER, "https://www.spar.hu/ajanlatok");
        }
        ResponseEntity<byte[]> response = getFollowingRedirects(url, new HttpEntity<>(headers), byte[].class);
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IllegalArgumentException("Ez a forrás nem engedélyezett.");
        }
        byte[] body = response.getBody() == null ? new byte[0] : response.getBody();
        if (body.length > FlyerUrlPolicy.MAX_BINARY_BYTES) {
            throw new IllegalArgumentException("A fájl túl nagy.");
        }
        if (pdfUrl(url) && body.length > 0 && !isPdf(body)) {
            body = new byte[0];
        }
        return ResponseEntity.status(response.getStatusCode()).headers(response.getHeaders()).body(body);
    }

    private <T> ResponseEntity<T> getFollowingRedirects(String url, HttpEntity<?> entity, Class<T> type) {
        String current = url;
        for (int hop = 0; hop <= FlyerUrlPolicy.MAX_REDIRECTS; hop++) {
            ResponseEntity<T> response = restTemplate.exchange(
                    URI.create(current), HttpMethod.GET, entity, type);
            if (!response.getStatusCode().is3xxRedirection()) {
                return response;
            }
            URI location = response.getHeaders().getLocation();
            if (location == null) {
                throw new IllegalArgumentException("Ez a forrás nem engedélyezett.");
            }
            URI resolved = URI.create(current).resolve(location);
            String next = resolved.toString();
            FlyerUrlPolicy.assertAllowed(next);
            current = next;
        }
        throw new IllegalArgumentException("Ez a forrás nem engedélyezett.");
    }

    private static boolean tescoHost(String value) {
        if (value == null) {
            return false;
        }
        String lower = value.toLowerCase();
        return lower.contains("tesco.hu") || lower.contains("tesco.com");
    }

    private static boolean sparHost(String value) {
        if (value == null) {
            return false;
        }
        String lower = value.toLowerCase();
        return lower.contains("spar.hu");
    }

    private static boolean pdfUrl(String url) {
        if (url == null) {
            return false;
        }
        String path = url.split("\\?", 2)[0].toLowerCase();
        return path.endsWith(".pdf");
    }

    static boolean isPdf(byte[] body) {
        if (body == null || body.length < 5) {
            return false;
        }
        int start = 0;
        int max = Math.min(body.length - 4, 16);
        while (start <= max) {
            if (body[start] == '%' && body[start + 1] == 'P' && body[start + 2] == 'D' && body[start + 3] == 'F') {
                return true;
            }
            start++;
        }
        return false;
    }

    private static void useUtf8ForText(RestTemplate template) {
        template.getMessageConverters().replaceAll(converter ->
                converter instanceof StringHttpMessageConverter
                        ? new StringHttpMessageConverter(StandardCharsets.UTF_8)
                        : converter);
    }
}

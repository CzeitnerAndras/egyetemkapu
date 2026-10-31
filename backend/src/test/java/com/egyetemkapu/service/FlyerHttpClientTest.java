package com.egyetemkapu.service;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.MockedStatic;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

class FlyerHttpClientTest {

    private HttpServer server;

    @BeforeEach
    void startServer() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.start();
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    @Test
    void readsUtf8WhenTheResponseDeclaresNoCharset() throws Exception {
        String body = "VATTACUKOR ÍZŰ FEHÉR SZŐLŐ";
        serve("/leaflet", "text/html", body);

        String fetched = new FlyerHttpClient().getText(url("/leaflet"));

        assertTrue(fetched.contains(body), fetched);
    }

    @Test
    void honoursAnExplicitCharset() throws Exception {
        String body = "SZŐLŐ";
        serve("/declared", "text/html; charset=utf-8", body);

        assertTrue(new FlyerHttpClient().getText(url("/declared")).contains(body));
    }

    @Test
    void doesNotFollowRedirectsOffTheAllowlist() throws Exception {
        server.createContext("/start", exchange -> {
            exchange.getResponseHeaders().set("Location", "http://169.254.169.254/latest/meta-data/");
            exchange.sendResponseHeaders(302, -1);
            exchange.close();
        });

        org.junit.jupiter.api.Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> new FlyerHttpClient().getText(url("/start")));
    }

    @Test
    void doesNotFollowRelativeRedirectsToLocalhost() throws Exception {
        final boolean[] secretHit = { false };
        server.createContext("/start", exchange -> {
            exchange.getResponseHeaders().set("Location", "/secret");
            exchange.sendResponseHeaders(302, -1);
            exchange.close();
        });
        server.createContext("/secret", exchange -> {
            secretHit[0] = true;
            byte[] bytes = "internal".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(bytes);
            }
        });

        org.junit.jupiter.api.Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> new FlyerHttpClient().getText(url("/start")));
        org.junit.jupiter.api.Assertions.assertFalse(secretHit[0]);
    }

    @Test
    void pdfUrlThatReturnsHtmlIsTreatedAsMissing() throws Exception {
        serve("/leaflet.pdf", "text/html", "<html>challenge</html>");

        byte[] fetched = new FlyerHttpClient().getBytes(url("/leaflet.pdf"), "https://www.spar.hu/ajanlatok");

        org.junit.jupiter.api.Assertions.assertEquals(0, fetched.length);
        org.junit.jupiter.api.Assertions.assertTrue(FlyerHttpClient.isPdf("%PDF-1.4".getBytes(StandardCharsets.UTF_8)));
        org.junit.jupiter.api.Assertions.assertFalse(FlyerHttpClient.isPdf("<html>".getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void storePagesSendABrowserProfileAndTheStoreReferer() {
        RestTemplate restTemplate = mock(RestTemplate.class);
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok("page"));
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(), eq(byte[].class)))
                .thenReturn(ResponseEntity.ok(new byte[] { 1, 2 }));
        FlyerHttpClient client = new FlyerHttpClient(restTemplate);
        List<String> pages = List.of(
                "https://www.mediamarkt.hu/hu/campaign/x",
                "https://www.cba.hu/aktualis-ajanlataink/",
                "https://real.hu/aktualis-ajanlataink/",
                "https://katalogus.metro.hu/feed");

        try (MockedStatic<FlyerUrlPolicy> policy = mockStatic(FlyerUrlPolicy.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            policy.when(() -> FlyerUrlPolicy.assertResolvesToPublicAddress(any())).thenAnswer(invocation -> null);
            for (String page : pages) {
                assertEquals("page", client.getText(page));
            }
            assertEquals(2, client.getBytes("https://cms-images.mmst.eu/a.jpg").length);
        }

        ArgumentCaptor<HttpEntity<?>> textCalls = ArgumentCaptor.forClass(HttpEntity.class);
        org.mockito.Mockito.verify(restTemplate, org.mockito.Mockito.times(4))
                .exchange(any(URI.class), eq(HttpMethod.GET), textCalls.capture(), eq(String.class));
        assertBrowser(textCalls.getAllValues().get(0), "https://www.mediamarkt.hu/");
        assertBrowser(textCalls.getAllValues().get(1), "https://www.cba.hu/");
        assertBrowser(textCalls.getAllValues().get(2), "https://real.hu/aktualis-ajanlataink/");
        assertTrue(textCalls.getAllValues().get(3).getHeaders().getFirst(HttpHeaders.USER_AGENT).startsWith("Egyetemkapu/"));

        ArgumentCaptor<HttpEntity<?>> imageCall = ArgumentCaptor.forClass(HttpEntity.class);
        org.mockito.Mockito.verify(restTemplate)
                .exchange(any(URI.class), eq(HttpMethod.GET), imageCall.capture(), eq(byte[].class));
        assertBrowser(imageCall.getValue(), "https://www.mediamarkt.hu/");
    }

    @Test
    void rejectedDownloadsAndRedirectedPostsAreRefused() {
        RestTemplate restTemplate = mock(RestTemplate.class);
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(), eq(byte[].class)))
                .thenReturn(ResponseEntity.status(403).body(new byte[] { 1 }));
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.POST), any(), eq(String.class)))
                .thenReturn(ResponseEntity.status(302).build());
        FlyerHttpClient client = new FlyerHttpClient(restTemplate);

        try (MockedStatic<FlyerUrlPolicy> policy = mockStatic(FlyerUrlPolicy.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            policy.when(() -> FlyerUrlPolicy.assertResolvesToPublicAddress(any())).thenAnswer(invocation -> null);
            assertThrows(IllegalArgumentException.class, () -> client.getBytes("https://www.cba.hu/a.jpg"));
            assertThrows(IllegalArgumentException.class,
                    () -> client.postJson("https://www.tesco.hu/akciok", "{}"));
        }
    }

    private static void assertBrowser(HttpEntity<?> entity, String referer) {
        HttpHeaders headers = entity.getHeaders();
        assertTrue(headers.getFirst(HttpHeaders.USER_AGENT).contains("Chrome"));
        assertEquals("hu-HU,hu;q=0.9,en;q=0.8", headers.getFirst(HttpHeaders.ACCEPT_LANGUAGE));
        assertEquals(referer, headers.getFirst(HttpHeaders.REFERER));
    }

    private void serve(String path, String contentType, String body) {
        server.createContext(path, exchange -> {
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", contentType);
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(bytes);
            }
        });
    }

    private String url(String path) {
        return "http://127.0.0.1:" + server.getAddress().getPort() + path;
    }
}

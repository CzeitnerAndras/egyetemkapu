package com.egyetemkapu.service;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertTrue;

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

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

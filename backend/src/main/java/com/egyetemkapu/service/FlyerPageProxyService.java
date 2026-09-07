package com.egyetemkapu.service;

import com.egyetemkapu.model.Flyer;
import com.egyetemkapu.model.FlyerPage;
import com.egyetemkapu.repository.FlyerPageRepository;
import com.egyetemkapu.repository.FlyerRepository;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.util.Set;

@Service
public class FlyerPageProxyService {

    private static final Set<String> ALLOWED_HOSTS = Set.of(
            "szorolap.aldi.hu",
            "view.publitas.com",
            "view-private.publitas.com",
            "www.spar.hu",
            "spar.hu",
            "www.penny.hu",
            "penny.hu",
            "www.aldi.hu",
            "aldi.hu"
    );

    private final FlyerRepository flyerRepository;
    private final FlyerPageRepository flyerPageRepository;
    private final FlyerHttpClient httpClient;
    private final FlyerPdfExtractor pdfExtractor;

    public FlyerPageProxyService(
            FlyerRepository flyerRepository,
            FlyerPageRepository flyerPageRepository,
            FlyerHttpClient httpClient,
            FlyerPdfExtractor pdfExtractor) {
        this.flyerRepository = flyerRepository;
        this.flyerPageRepository = flyerPageRepository;
        this.httpClient = httpClient;
        this.pdfExtractor = pdfExtractor;
    }

    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> pageImage(Long flyerId, int pageNumber) {
        Flyer flyer = flyerRepository.findById(flyerId)
                .orElseThrow(() -> new IllegalArgumentException("Nincs ilyen akciós újság."));
        FlyerPage page = flyerPageRepository.findByFlyerIdAndPageNumber(flyerId, pageNumber)
                .orElseThrow(() -> new IllegalArgumentException("Nincs ilyen oldal."));

        if (page.getImageUrl() != null && !page.getImageUrl().isBlank()) {
            return fetchAllowed(page.getImageUrl());
        }
        if (flyer.getPdfUrl() != null && !flyer.getPdfUrl().isBlank()) {
            byte[] pdf = fetchAllowedBytes(flyer.getPdfUrl());
            byte[] png = pdfExtractor.renderPagePng(pdf, pageNumber);
            if (png.length == 0) {
                throw new IllegalArgumentException("Az oldal nem jeleníthető meg.");
            }
            return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).body(png);
        }
        throw new IllegalArgumentException("Ehhez az oldalhoz nincs megjeleníthető kép.");
    }

    private ResponseEntity<byte[]> fetchAllowed(String url) {
        assertAllowed(url);
        ResponseEntity<byte[]> remote = httpClient.getBytesWithHeaders(url);
        MediaType type = remote.getHeaders().getContentType();
        return ResponseEntity.ok()
                .contentType(type == null ? MediaType.IMAGE_JPEG : type)
                .body(remote.getBody() == null ? new byte[0] : remote.getBody());
    }

    private byte[] fetchAllowedBytes(String url) {
        assertAllowed(url);
        return httpClient.getBytes(url);
    }

    static void assertAllowed(String url) {
        URI uri = URI.create(url);
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
        if (!"https".equalsIgnoreCase(uri.getScheme()) || !ALLOWED_HOSTS.contains(host)) {
            throw new IllegalArgumentException("Ez a forrás nem engedélyezett.");
        }
    }
}

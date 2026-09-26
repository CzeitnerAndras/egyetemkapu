package com.egyetemkapu.service;

import com.egyetemkapu.model.Flyer;
import com.egyetemkapu.model.FlyerPage;
import com.egyetemkapu.repository.FlyerPageRepository;
import com.egyetemkapu.repository.FlyerRepository;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.AlphaComposite;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class FlyerPageProxyService {

    private static final int MAX_CACHE = 96;
    private static final byte[] JPEG_MAGIC = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_MAGIC = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] GIF_MAGIC = {0x47, 0x49, 0x46, 0x38};

    private record CachedImage(MediaType type, byte[] body) {
    }

    private final FlyerRepository flyerRepository;
    private final FlyerPageRepository flyerPageRepository;
    private final FlyerHttpClient httpClient;
    private final FlyerPdfExtractor pdfExtractor;
    private final FlyerCatalogParser parser;
    private final ConcurrentHashMap<String, CachedImage> imageCache = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, byte[]> pdfCache = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> spreadsImageCache = new ConcurrentHashMap<>();

    public FlyerPageProxyService(
            FlyerRepository flyerRepository,
            FlyerPageRepository flyerPageRepository,
            FlyerHttpClient httpClient,
            FlyerPdfExtractor pdfExtractor,
            FlyerCatalogParser parser) {
        this.flyerRepository = flyerRepository;
        this.flyerPageRepository = flyerPageRepository;
        this.httpClient = httpClient;
        this.pdfExtractor = pdfExtractor;
        this.parser = parser;
    }

    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> pageImage(Long flyerId, int pageNumber) {
        Flyer flyer = flyerRepository.findById(flyerId)
                .orElseThrow(() -> new IllegalArgumentException("Nincs ilyen akciós újság."));
        FlyerPage page = flyerPageRepository.findByFlyerIdAndPageNumber(flyerId, pageNumber)
                .orElseThrow(() -> new IllegalArgumentException("Nincs ilyen oldal."));

        String cacheKey = flyerId + ":" + pageNumber;
        CachedImage cached = imageCache.get(cacheKey);
        if (cached != null) {
            return respond(cached);
        }

        String imageUrl = FlyerCatalogParser.resolveAssetUrl(flyer.getOfficialUrl(), page.getImageUrl());
        if (imageUrl == null) {
            imageUrl = lookupPublitasImage(flyer, pageNumber);
        }
        if (FlyerCatalogParser.isAuchanIpaperUrl(flyer.getOfficialUrl())) {
            String fresh = lookupIpaperImage(flyer, pageNumber);
            if (fresh != null) {
                imageUrl = fresh;
            }
        }
        if (imageUrl != null) {
            CachedImage image = fetchAllowed(imageUrl, flyer.getOfficialUrl());
            image = withPennyTextLayer(image, imageUrl, flyer.getOfficialUrl());
            putImage(cacheKey, image);
            return respond(image);
        }
        if (flyer.getPdfUrl() != null && !flyer.getPdfUrl().isBlank()) {
            byte[] pdf = pdfCache.computeIfAbsent(flyer.getPdfUrl(), this::fetchAllowedBytes);
            byte[] png = pdfExtractor.renderPagePng(pdf, pageNumber);
            if (png.length == 0) {
                throw new IllegalArgumentException("Az oldal nem jeleníthető meg.");
            }
            CachedImage image = new CachedImage(MediaType.IMAGE_PNG, png);
            putImage(cacheKey, image);
            return respond(image);
        }
        throw new IllegalArgumentException("Ehhez az oldalhoz nincs megjeleníthető kép.");
    }

    private String lookupPublitasImage(Flyer flyer, int pageNumber) {
        String official = flyer.getOfficialUrl();
        if (!FlyerUrlPolicy.isAllowed(official)) {
            return null;
        }
        String key = official + ":" + pageNumber;
        String cached = spreadsImageCache.get(key);
        if (cached != null) {
            return cached;
        }
        try {
            String base = official.endsWith("/") ? official : official + "/";
            String spreadsUrl = base + "spreads.json";
            FlyerUrlPolicy.assertAllowed(spreadsUrl);
            String spreadsJson = httpClient.getText(spreadsUrl);
            FlyerCatalogParser.DiscoveredPaper paper = new FlyerCatalogParser.DiscoveredPaper(
                    flyer.getStore(), flyer.getTitle(), official, flyer.getPdfUrl(), "lookup", null, null);
            FlyerCatalogParser.ParsedCatalog catalog = parser.parsePublitas(paper, null, spreadsJson);
            catalog.pages().forEach(parsed -> {
                if (parsed.imageUrl() != null) {
                    spreadsImageCache.put(official + ":" + parsed.pageNumber(), parsed.imageUrl());
                }
            });
        } catch (Exception ignored) {
            return null;
        }
        return spreadsImageCache.get(key);
    }

    private String lookupIpaperImage(Flyer flyer, int pageNumber) {
        String official = flyer.getOfficialUrl();
        if (!FlyerCatalogParser.isAuchanIpaperUrl(official) || !FlyerUrlPolicy.isAllowed(official)) {
            return null;
        }
        String key = official + ":" + pageNumber;
        String cached = spreadsImageCache.get(key);
        if (cached != null) {
            return cached;
        }
        try {
            FlyerUrlPolicy.assertAllowed(official);
            String html = httpClient.getText(official);
            FlyerCatalogParser.DiscoveredPaper paper = new FlyerCatalogParser.DiscoveredPaper(
                    flyer.getStore(), flyer.getTitle(), official, flyer.getPdfUrl(), "lookup", null, null);
            FlyerCatalogParser.ParsedCatalog catalog = parser.parseAuchanIpaper(paper, html);
            catalog.pages().forEach(parsed -> {
                if (parsed.imageUrl() != null) {
                    spreadsImageCache.put(official + ":" + parsed.pageNumber(), parsed.imageUrl());
                }
            });
        } catch (Exception ignored) {
            return null;
        }
        return spreadsImageCache.get(key);
    }

    private CachedImage withPennyTextLayer(CachedImage base, String imageUrl, String referer) {
        String overlayUrl = FlyerCatalogParser.pennyTextLayerUrl(imageUrl);
        if (overlayUrl == null) {
            return base;
        }
        try {
            CachedImage overlay = fetchAllowed(overlayUrl, referer);
            byte[] combined = overlayImages(base.body(), overlay.body());
            if (combined.length > 32) {
                return new CachedImage(MediaType.IMAGE_PNG, combined);
            }
        } catch (Exception ignored) {
            // Fall back to the photo layer if the text overlay is missing.
        }
        return base;
    }

    static byte[] overlayImages(byte[] baseBytes, byte[] overlayBytes) {
        try {
            BufferedImage base = ImageIO.read(new ByteArrayInputStream(baseBytes));
            BufferedImage overlay = ImageIO.read(new ByteArrayInputStream(overlayBytes));
            if (base == null || overlay == null
                    || tooLarge(base) || tooLarge(overlay)) {
                return new byte[0];
            }
            BufferedImage out = new BufferedImage(base.getWidth(), base.getHeight(), BufferedImage.TYPE_INT_ARGB);
            Graphics2D graphics = out.createGraphics();
            graphics.drawImage(base, 0, 0, base.getWidth(), base.getHeight(), null);
            graphics.setComposite(AlphaComposite.SrcOver);
            graphics.drawImage(overlay, 0, 0, base.getWidth(), base.getHeight(), null);
            graphics.dispose();
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            ImageIO.write(out, "png", buffer);
            return buffer.toByteArray();
        } catch (Exception e) {
            return new byte[0];
        }
    }

    private CachedImage fetchAllowed(String url, String referer) {
        FlyerUrlPolicy.assertAllowed(url);
        ResponseEntity<byte[]> remote = httpClient.getBytesWithHeaders(url, referer);
        byte[] body = remote.getBody() == null ? new byte[0] : remote.getBody();
        if (body.length < 32) {
            throw new IllegalArgumentException("Az oldal nem jeleníthető meg.");
        }
        return new CachedImage(imageMediaType(body), body);
    }

    private byte[] fetchAllowedBytes(String url) {
        FlyerUrlPolicy.assertAllowed(url);
        String referer = tescoReferer(url);
        if (referer != null) {
            byte[] body = httpClient.getBytes(url, referer);
            return body == null ? new byte[0] : body;
        }
        return httpClient.getBytes(url);
    }

    private static String tescoReferer(String url) {
        if (url != null && (url.contains("tesco.com") || url.contains("tesco.hu"))) {
            return "https://www.tesco.hu/akciok/katalogusok";
        }
        return null;
    }

    private void putImage(String key, CachedImage image) {
        if (imageCache.size() >= MAX_CACHE) {
            imageCache.clear();
        }
        imageCache.put(key, image);
    }

    private static ResponseEntity<byte[]> respond(CachedImage image) {
        return ResponseEntity.ok()
                .contentType(image.type())
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic())
                .body(image.body());
    }

    static MediaType imageMediaType(byte[] body) {
        if (startsWith(body, JPEG_MAGIC)) {
            return MediaType.IMAGE_JPEG;
        }
        if (startsWith(body, PNG_MAGIC)) {
            return MediaType.IMAGE_PNG;
        }
        if (startsWith(body, GIF_MAGIC)) {
            return MediaType.IMAGE_GIF;
        }
        if (isWebp(body)) {
            return MediaType.parseMediaType("image/webp");
        }
        throw new IllegalArgumentException("Az oldal nem jeleníthető meg.");
    }

    private static boolean startsWith(byte[] body, byte[] magic) {
        if (body == null || body.length < magic.length) {
            return false;
        }
        for (int i = 0; i < magic.length; i++) {
            if (body[i] != magic[i]) {
                return false;
            }
        }
        return true;
    }

    private static boolean isWebp(byte[] body) {
        return body != null
                && body.length >= 12
                && body[0] == 'R' && body[1] == 'I' && body[2] == 'F' && body[3] == 'F'
                && body[8] == 'W' && body[9] == 'E' && body[10] == 'B' && body[11] == 'P';
    }

    private static boolean tooLarge(BufferedImage image) {
        return image.getWidth() > FlyerUrlPolicy.MAX_IMAGE_EDGE
                || image.getHeight() > FlyerUrlPolicy.MAX_IMAGE_EDGE;
    }

    static void assertAllowed(String url) {
        FlyerUrlPolicy.assertAllowed(url);
    }
}

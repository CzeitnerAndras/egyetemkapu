package com.egyetemkapu.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

@Component
public class FlyerCatalogParser {

    public record DiscoveredPaper(
            String store,
            String title,
            String officialUrl,
            String pdfUrl,
            String sourceKey,
            LocalDate validFrom,
            LocalDate validTo
    ) {
    }

    public record ParsedPage(int pageNumber, String imageUrl, String text) {
    }

    public record ParsedProduct(String name, String priceText, int pageNumber, String imageUrl) {
    }

    public record ParsedCatalog(
            DiscoveredPaper paper,
            List<ParsedPage> pages,
            List<ParsedProduct> products
    ) {
    }

    private static final Pattern ALDI_VIEWER = Pattern.compile(
            "https?://szorolap\\.aldi\\.hu/([a-zA-Z0-9_-]+)");
    private static final Pattern SPAR_PDF = Pattern.compile(
            "https?://(?:www\\.)?spar\\.hu(/content/dam/sparhuwebsite/_flyers/[^\"'\\s>]+\\.pdf)",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern PUBLITAS = Pattern.compile(
            "https?://(?:view\\.)?publitas\\.com/[^\"'\\s>]+",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern PENNY_PRODUCT = Pattern.compile(
            "(?is)<(?:h[1-4]|p|span|div)[^>]*>\\s*([^<]{3,120}?)\\s*</(?:h[1-4]|p|span|div)>\\s*"
                    + "[^<]{0,180}?(\\d[\\d\\s.]{0,8}\\s*Ft)");
    private static final Pattern JSON_LD = Pattern.compile(
            "(?is)<script[^>]+type=['\"]application/ld\\+json['\"][^>]*>(.*?)</script>");
    private static final Pattern ISO_DATE = Pattern.compile("20\\d{2}[-.]\\d{2}[-.]\\d{2}");

    private final ObjectMapper objectMapper;

    public FlyerCatalogParser() {
        this(new ObjectMapper());
    }

    public FlyerCatalogParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public List<DiscoveredPaper> discoverAldiPublications(String html, LocalDate today) {
        Map<String, DiscoveredPaper> papers = new LinkedHashMap<>();
        if (html != null) {
            Matcher matcher = ALDI_VIEWER.matcher(html);
            while (matcher.find()) {
                String slug = matcher.group(1);
                String url = "https://szorolap.aldi.hu/" + slug + "/";
                papers.putIfAbsent(slug, new DiscoveredPaper(
                        "aldi",
                        humanizeSlug(slug),
                        url,
                        null,
                        "aldi:" + slug,
                        today.minusDays(3),
                        today.plusDays(4)
                ));
            }
        }
        if (papers.isEmpty()) {
            int week = today.get(java.time.temporal.WeekFields.ISO.weekOfWeekBasedYear());
            int year = today.get(java.time.temporal.WeekFields.ISO.weekBasedYear());
            for (int offset = 0; offset <= 1; offset++) {
                int candidate = week - offset;
                if (candidate < 1) {
                    continue;
                }
                String slug = "aldi_online_akcios_ujsag_" + year + "_kw" + String.format("%02d", candidate);
                papers.putIfAbsent(slug, new DiscoveredPaper(
                        "aldi",
                        "ALDI online akciós újság - " + year + ". " + candidate + ". hét",
                        "https://szorolap.aldi.hu/" + slug + "/",
                        null,
                        "aldi:" + slug,
                        today.minusDays(3),
                        today.plusDays(4)
                ));
            }
        }
        return new ArrayList<>(papers.values());
    }

    public List<DiscoveredPaper> discoverSparPdfs(String html, LocalDate today) {
        Map<String, DiscoveredPaper> papers = new LinkedHashMap<>();
        if (html == null) {
            return List.of();
        }
        Matcher matcher = SPAR_PDF.matcher(html);
        while (matcher.find() && papers.size() < 6) {
            String path = matcher.group(1);
            String url = "https://www.spar.hu" + path;
            String file = path.substring(path.lastIndexOf('/') + 1);
            if (file.toLowerCase().contains("partner") || file.toLowerCase().contains("nyitas")) {
                continue;
            }
            papers.putIfAbsent(path, new DiscoveredPaper(
                    "spar",
                    humanizeSlug(file.replace(".pdf", "")),
                    "https://www.spar.hu/ajanlatok",
                    url,
                    "spar:" + path,
                    today.minusDays(3),
                    today.plusDays(4)
            ));
        }
        return new ArrayList<>(papers.values());
    }

    public List<DiscoveredPaper> discoverPennyPapers(String html, LocalDate today) {
        Map<String, DiscoveredPaper> papers = new LinkedHashMap<>();
        if (html != null) {
            Matcher aldiLike = Pattern.compile("https?://[^\"'\\s>]+(?:publitas|szorolap|reklamujsag)[^\"'\\s>]*",
                    Pattern.CASE_INSENSITIVE).matcher(html);
            while (aldiLike.find() && papers.size() < 4) {
                String url = aldiLike.group();
                papers.putIfAbsent(url, new DiscoveredPaper(
                        "penny",
                        "PENNY reklámújság",
                        url,
                        url.toLowerCase().contains(".pdf") ? url : null,
                        "penny:" + url,
                        today.minusDays(3),
                        today.plusDays(4)
                ));
            }
            Matcher publitas = PUBLITAS.matcher(html);
            while (publitas.find() && papers.size() < 4) {
                String url = publitas.group();
                papers.putIfAbsent(url, new DiscoveredPaper(
                        "penny",
                        "PENNY reklámújság",
                        url,
                        null,
                        "penny:" + url,
                        today.minusDays(3),
                        today.plusDays(4)
                ));
            }
        }
        papers.putIfAbsent("penny-official", new DiscoveredPaper(
                "penny",
                "PENNY aktuális ajánlatok",
                "https://www.penny.hu/ajanlatok",
                null,
                "penny:ajanlatok",
                today.minusDays(3),
                today.plusDays(4)
        ));
        return new ArrayList<>(papers.values());
    }

    public ParsedCatalog parsePublitas(DiscoveredPaper paper, String dataJson, String spreadsJson) {
        List<ParsedPage> pages = new ArrayList<>();
        List<ParsedProduct> products = new ArrayList<>();
        String pdfUrl = paper.pdfUrl();
        String title = paper.title();
        LocalDate from = paper.validFrom();
        LocalDate to = paper.validTo();
        try {
            if (dataJson != null && !dataJson.isBlank()) {
                JsonNode data = objectMapper.readTree(dataJson);
                title = textOr(data.path("config").path("publicationTitle"), title);
                pdfUrl = textOr(data.path("config").path("downloadPdfUrl"), pdfUrl);
                LocalDate[] range = parseDates(title + " " + textOr(data.path("config").path("description"), ""));
                if (range[0] != null) {
                    from = range[0];
                }
                if (range[1] != null) {
                    to = range[1];
                }
            }
            if (spreadsJson != null && !spreadsJson.isBlank()) {
                JsonNode root = objectMapper.readTree(spreadsJson);
                JsonNode spreads = root.has("spreads") ? root.get("spreads") : root;
                if (spreads.isArray()) {
                    int fallbackPage = 1;
                    for (JsonNode spread : spreads) {
                        JsonNode spreadPages = spread.path("pages");
                        if (spreadPages.isArray()) {
                            for (JsonNode page : spreadPages) {
                                int number = page.path("number").asInt(page.path("pageNumber").asInt(fallbackPage));
                                String image = firstImage(page);
                                String text = collectText(page);
                                pages.add(new ParsedPage(number, image, text));
                                collectProducts(page, number, products);
                                fallbackPage = number + 1;
                            }
                        }
                    }
                }
            }
        } catch (Exception ignored) {
            // Keep whatever was parsed; callers still persist metadata.
        }
        DiscoveredPaper resolved = new DiscoveredPaper(
                paper.store(), title, paper.officialUrl(), pdfUrl, paper.sourceKey(), from, to);
        return new ParsedCatalog(resolved, pages, products);
    }

    public List<ParsedProduct> extractHtmlProducts(String html) {
        Map<String, ParsedProduct> products = new LinkedHashMap<>();
        if (html == null) {
            return List.of();
        }
        Matcher jsonLd = JSON_LD.matcher(html);
        while (jsonLd.find()) {
            try {
                JsonNode node = objectMapper.readTree(jsonLd.group(1));
                collectJsonLdProducts(node, products);
            } catch (Exception ignored) {
                // Skip broken JSON-LD blocks.
            }
        }
        Matcher matcher = PENNY_PRODUCT.matcher(html);
        while (matcher.find() && products.size() < 400) {
            String name = matcher.group(1).replaceAll("\\s+", " ").trim();
            String price = matcher.group(2).replaceAll("\\s+", " ").trim();
            if (name.length() < 3 || name.contains("{") || name.contains("http")) {
                continue;
            }
            products.putIfAbsent(HungarianText.normalize(name), new ParsedProduct(name, price, 1, null));
        }
        return new ArrayList<>(products.values());
    }

    public LocalDate[] parseDates(String text) {
        LocalDate[] range = new LocalDate[2];
        if (text == null) {
            return range;
        }
        Matcher matcher = ISO_DATE.matcher(text.replace('.', '-'));
        int i = 0;
        while (matcher.find() && i < 2) {
            try {
                range[i++] = LocalDate.parse(matcher.group().replace('.', '-'));
            } catch (Exception ignored) {
            }
        }
        return range;
    }

    private void collectJsonLdProducts(JsonNode node, Map<String, ParsedProduct> products) {
        if (node == null || node.isNull()) {
            return;
        }
        if (node.isArray()) {
            node.forEach(child -> collectJsonLdProducts(child, products));
            return;
        }
        String type = node.path("@type").asText("");
        if ("Product".equalsIgnoreCase(type) || "Offer".equalsIgnoreCase(type)) {
            String name = textOr(node.path("name"), "");
            String price = textOr(node.path("offers").path("price"), textOr(node.path("price"), ""));
            if (!name.isBlank()) {
                products.putIfAbsent(HungarianText.normalize(name), new ParsedProduct(name, price.isBlank() ? null : price + " Ft", 1, null));
            }
        }
        if (node.isObject()) {
            node.fields().forEachRemaining(entry -> {
                if (entry.getValue().isContainerNode()) {
                    collectJsonLdProducts(entry.getValue(), products);
                }
            });
        }
    }

    private void collectProducts(JsonNode page, int pageNumber, List<ParsedProduct> products) {
        page.findValues("products").forEach(list -> {
            if (!list.isArray()) {
                return;
            }
            for (JsonNode product : list) {
                String name = textOr(product.path("title"), textOr(product.path("name"), ""));
                if (name.isBlank()) {
                    continue;
                }
                String price = textOr(product.path("price"), textOr(product.path("salePrice"), textOr(product.path("effective_sale_price"), "")));
                String image = textOr(product.path("image"), textOr(product.path("image_link"), null));
                products.add(new ParsedProduct(name, price.isBlank() ? null : price, pageNumber, image));
            }
        });
        page.findValues("hotspots").forEach(list -> {
            if (!list.isArray()) {
                return;
            }
            for (JsonNode hotspot : list) {
                collectProducts(hotspot, pageNumber, products);
            }
        });
    }

    private String collectText(JsonNode page) {
        StringBuilder text = new StringBuilder();
        appendText(page.path("text"), text);
        appendText(page.path("ocrText"), text);
        page.findValues("title").forEach(node -> appendText(node, text));
        page.findValues("name").forEach(node -> appendText(node, text));
        return text.toString().trim();
    }

    private void appendText(JsonNode node, StringBuilder text) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return;
        }
        if (node.isTextual()) {
            String value = node.asText().trim();
            if (!value.isEmpty()) {
                if (!text.isEmpty()) {
                    text.append(' ');
                }
                text.append(value);
            }
        } else if (node.isArray() || node.isObject()) {
            node.forEach(child -> appendText(child, text));
        }
    }

    private String firstImage(JsonNode page) {
        String direct = textOr(page.path("image"), textOr(page.path("url"), null));
        if (direct != null) {
            return direct;
        }
        JsonNode images = page.path("images");
        for (String key : List.of("at800", "at1000", "at600", "at1200", "at200")) {
            String found = textOr(images.path(key), null);
            if (found != null) {
                return found.startsWith("http") ? found : null;
            }
        }
        return textOr(page.path("screenshot"), null);
    }

    private static String textOr(JsonNode node, String fallback) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return fallback;
        }
        String value = node.asText("");
        return value.isBlank() ? fallback : value;
    }

    private static String humanizeSlug(String slug) {
        return slug.replace('_', ' ').replace('-', ' ').trim();
    }
}

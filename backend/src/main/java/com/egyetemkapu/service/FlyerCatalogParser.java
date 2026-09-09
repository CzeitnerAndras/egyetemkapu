package com.egyetemkapu.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.WeekFields;
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
            "https?://(?:www\\.)?spar\\.hu(/content/dam/[^\"'\\s>]+\\.pdf)",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern SPAR_PATH = Pattern.compile(
            "(/content/dam/sparhuwebsite/_flyers/[^\"'\\s>]+\\.pdf)",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern PUBLITAS = Pattern.compile(
            "https?://(?:view\\.)?publitas\\.com/[^\"'\\s>]+",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern PENNY_PRODUCT = Pattern.compile(
            "(?is)<(?:h[1-4]|p|span|div)[^>]*>\\s*([^<]{3,120}?)\\s*</(?:h[1-4]|p|span|div)>\\s*"
                    + "[^<]{0,180}?(\\d[\\d\\s.]{0,8}\\s*Ft)");
    private static final Pattern PLAIN_PRICE = Pattern.compile(
            "([\\p{L}][\\p{L}0-9 .%+\\-]{2,70}?)\\s+(\\d[\\d\\s.]{1,8}\\s*Ft)");
    private static final Pattern JSON_LD = Pattern.compile(
            "(?is)<script[^>]+type=['\"]application/ld\\+json['\"][^>]*>(.*?)</script>");
    private static final Pattern ISO_DATE = Pattern.compile("20\\d{2}[-.]\\d{2}[-.]\\d{2}");
    private static final Pattern PENNY_REWE = Pattern.compile(
            "https?://files\\.rewe\\.co\\.at/PennyIntLeaflet/HU/(\\d{6})",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern PENNY_PAGE_LINK = Pattern.compile(
            "class=\"internalLink\"[^>]*href=\"(?:\\./)?(\\d+)(?:-(\\d+))?/");
    private static final Pattern PENNY_TITLE = Pattern.compile("(?is)<title>(.*?)</title>");
    private static final Pattern PENNY_FB_TITLE = Pattern.compile("FBInit\\.TITLE\\s*=\\s*\"(.*?)\"");
    private static final Pattern PENNY_TEXT = Pattern.compile(
            "(?is)id=[\"']text-container[\"'][^>]*>(.*?)</div>");
    private static final Pattern HTML_ENTITY = Pattern.compile("&#(\\d+);");
    private static final int PENNY_MAX_PAGES = 48;

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
        String haystack = html == null ? "" : html.replace("\\/", "/");
        addSparMatches(papers, SPAR_PDF.matcher(haystack), today, true);
        addSparMatches(papers, SPAR_PATH.matcher(haystack), today, true);
        if (papers.isEmpty()) {
            for (DiscoveredPaper fallback : sparWeeklyFallbacks(today)) {
                papers.putIfAbsent(fallback.sourceKey(), fallback);
            }
        }
        return new ArrayList<>(papers.values());
    }

    public List<DiscoveredPaper> sparWeeklyFallbacks(LocalDate today) {
        List<DiscoveredPaper> papers = new ArrayList<>();
        LocalDate thursday = today.with(DayOfWeek.THURSDAY);
        if (thursday.isAfter(today)) {
            thursday = thursday.minusWeeks(1);
        }
        for (LocalDate start : List.of(thursday, thursday.plusWeeks(1))) {
            String folder = start.format(DateTimeFormatter.ofPattern("yyyy/MMdd"));
            String stamp = start.format(DateTimeFormatter.ofPattern("MMdd"));
            addSparFallback(papers, folder, "spar-szorolap-" + stamp + "p.pdf", "SPAR szórólap", start);
            addSparFallback(papers, folder, "interspar-szorolap-" + stamp + "p.pdf", "INTERSPAR szórólap", start);
            addSparFallback(papers, folder, "spar-market-" + stamp + "p.pdf", "SPAR market", start);
        }
        return papers;
    }

    public List<DiscoveredPaper> discoverPennyPapers(String html, LocalDate today) {
        Map<String, DiscoveredPaper> papers = new LinkedHashMap<>();
        if (html != null) {
            Matcher rewe = PENNY_REWE.matcher(html.replace("\\/", "/"));
            while (rewe.find()) {
                DiscoveredPaper paper = pennyRewePaper(
                        Integer.parseInt(rewe.group(1).substring(0, 4)),
                        Integer.parseInt(rewe.group(1).substring(4)));
                papers.putIfAbsent(paper.sourceKey(), paper);
            }
            Matcher aldiLike = Pattern.compile("https?://[^\"'\\s>]+(?:publitas|szorolap)[^\"'\\s>]*",
                    Pattern.CASE_INSENSITIVE).matcher(html.replace("\\/", "/"));
            while (aldiLike.find() && papers.size() < 8) {
                String url = aldiLike.group();
                if (isPennyLandingPage(url) || isPennyReweUrl(url)) {
                    continue;
                }
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
            while (publitas.find() && papers.size() < 8) {
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
        for (DiscoveredPaper fallback : pennyWeeklyFallbacks(today)) {
            papers.putIfAbsent(fallback.sourceKey(), fallback);
        }
        return new ArrayList<>(papers.values());
    }

    public List<DiscoveredPaper> pennyWeeklyFallbacks(LocalDate today) {
        WeekFields iso = WeekFields.ISO;
        Map<String, DiscoveredPaper> papers = new LinkedHashMap<>();
        for (int offset = -1; offset <= 1; offset++) {
            LocalDate day = today.plusWeeks(offset);
            DiscoveredPaper paper = pennyRewePaper(
                    day.get(iso.weekBasedYear()),
                    day.get(iso.weekOfWeekBasedYear()));
            papers.putIfAbsent(paper.sourceKey(), paper);
        }
        return new ArrayList<>(papers.values());
    }

    public ParsedCatalog parsePennyLeaflet(DiscoveredPaper paper, String html) {
        String title = extractPennyTitle(html);
        if (title.isBlank()) {
            title = paper.title();
        }
        int pageCount = countPennyPages(html);
        String page1Text = extractPennyPageText(html);
        List<ParsedPage> pages = new ArrayList<>();
        for (int page = 1; page <= pageCount; page++) {
            String text = page == 1 ? page1Text : "";
            pages.add(new ParsedPage(page, pennyPageImageUrl(paper.officialUrl(), page), text));
        }
        List<ParsedProduct> products = extractPricedItems(page1Text, 1);
        DiscoveredPaper resolved = new DiscoveredPaper(
                paper.store(),
                title,
                paper.officialUrl(),
                paper.pdfUrl(),
                paper.sourceKey(),
                paper.validFrom(),
                paper.validTo());
        return new ParsedCatalog(resolved, pages, products);
    }

    public int countPennyPages(String html) {
        if (html == null || html.isBlank()) {
            return 0;
        }
        int max = 0;
        Matcher matcher = PENNY_PAGE_LINK.matcher(html);
        while (matcher.find()) {
            max = Math.max(max, Integer.parseInt(matcher.group(1)));
        }
        if (max == 0 && looksLikePennyLeaflet(html)) {
            return 1;
        }
        return Math.min(max, PENNY_MAX_PAGES);
    }

    public String pennyPageRelPath(String html, int pageNumber) {
        if (pageNumber <= 1) {
            return "";
        }
        if (html != null) {
            Matcher matcher = PENNY_PAGE_LINK.matcher(html);
            while (matcher.find()) {
                if (Integer.parseInt(matcher.group(1)) == pageNumber && matcher.group(2) != null) {
                    return matcher.group(1) + "-" + matcher.group(2) + "/";
                }
            }
        }
        return pageNumber + "/";
    }

    public String extractPennyTitle(String html) {
        if (html == null) {
            return "";
        }
        Matcher title = PENNY_TITLE.matcher(html);
        if (title.find()) {
            String value = htmlUnescape(title.group(1)).replaceAll("(?i)\\s*-\\s*page\\s+\\d+.*", "").trim();
            if (!value.isBlank()) {
                return value;
            }
        }
        Matcher fb = PENNY_FB_TITLE.matcher(html);
        if (fb.find()) {
            return htmlUnescape(fb.group(1)).trim();
        }
        return "";
    }

    public String extractPennyPageText(String html) {
        if (html == null || html.isBlank() || html.contains("Code injection detected")) {
            return "";
        }
        Matcher matcher = PENNY_TEXT.matcher(html);
        if (!matcher.find()) {
            return "";
        }
        String inner = matcher.group(1)
                .replaceAll("(?is)<p class=\"powered-by\".*", "")
                .replaceAll("(?is)<script.*?</script>", " ")
                .replaceAll("(?s)<[^>]+>", " ");
        return htmlUnescape(inner).replaceAll("\\s+", " ").trim();
    }

    public static String pennyPageImageUrl(String leafletUrl, int pageNumber) {
        if (leafletUrl == null || leafletUrl.isBlank()) {
            return null;
        }
        String base = leafletUrl.endsWith("/") ? leafletUrl : leafletUrl + "/";
        return base + "files/assets/common/page-html5-substrates/page"
                + String.format("%04d", pageNumber) + "_2.jpg";
    }

    public static boolean looksLikePennyLeaflet(String html) {
        if (html == null || html.length() < 200) {
            return false;
        }
        String lower = html.toLowerCase();
        return lower.contains("flippingbook")
                || lower.contains("fbinit")
                || lower.contains("page-html5-substrates")
                || lower.contains("rekl&#225;m")
                || lower.contains("reklámújság");
    }

    public static boolean isPennyReweUrl(String url) {
        return url != null && url.toLowerCase().contains("files.rewe.co.at/pennyintleaflet");
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
                                String image = firstImage(page, paper.officialUrl());
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
        if (products.isEmpty()) {
            for (ParsedPage page : pages) {
                products.addAll(extractPricedItems(page.text(), page.pageNumber()));
            }
        }
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

    public List<ParsedProduct> extractPricedItems(String text, int pageNumber) {
        List<ParsedProduct> products = new ArrayList<>();
        if (text == null || text.isBlank()) {
            return products;
        }
        Matcher matcher = PLAIN_PRICE.matcher(text.replace('\n', ' '));
        while (matcher.find() && products.size() < 80) {
            String name = matcher.group(1).replaceAll("\\s+", " ").trim();
            String price = matcher.group(2).replaceAll("\\s+", " ").trim();
            if (name.length() < 3 || name.contains("http") || name.toLowerCase().contains("érvényes")) {
                continue;
            }
            products.add(new ParsedProduct(name, price, pageNumber, null));
        }
        return products;
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

    private String firstImage(JsonNode page, String officialUrl) {
        String direct = resolveAssetUrl(officialUrl, textOr(page.path("image"), textOr(page.path("url"), null)));
        if (direct != null) {
            return direct;
        }
        JsonNode images = page.path("images");
        for (String key : List.of("at800", "at600", "at1000", "at1200", "at200", "at1600")) {
            String found = resolveAssetUrl(officialUrl, textOr(images.path(key), null));
            if (found != null) {
                return found;
            }
        }
        return resolveAssetUrl(officialUrl, textOr(page.path("screenshot"), null));
    }

    static String resolveAssetUrl(String officialUrl, String asset) {
        if (asset == null || asset.isBlank()) {
            return null;
        }
        String trimmed = asset.trim();
        if (trimmed.startsWith("//")) {
            trimmed = "https:" + trimmed;
        }
        try {
            java.net.URI resolved;
            if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
                resolved = java.net.URI.create(trimmed);
            } else if (officialUrl == null || officialUrl.isBlank()) {
                return null;
            } else {
                resolved = java.net.URI.create(officialUrl).resolve(trimmed);
            }
            if (!"https".equalsIgnoreCase(resolved.getScheme()) || resolved.getHost() == null) {
                return null;
            }
            return resolved.toString();
        } catch (IllegalArgumentException ignored) {
            return null;
        }
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

    private void addSparMatches(Map<String, DiscoveredPaper> papers, Matcher matcher, LocalDate today, boolean limit) {
        while (matcher.find() && (!limit || papers.size() < 6)) {
            String path = matcher.group(1);
            addSparPaper(papers, path, today);
        }
    }

    private void addSparFallback(List<DiscoveredPaper> papers, String folder, String file, String title, LocalDate start) {
        String path = "/content/dam/sparhuwebsite/_flyers/" + folder + "/" + file;
        Map<String, DiscoveredPaper> one = new LinkedHashMap<>();
        addSparPaper(one, path, start);
        papers.addAll(one.values());
    }

    private void addSparPaper(Map<String, DiscoveredPaper> papers, String path, LocalDate start) {
        String file = path.substring(path.lastIndexOf('/') + 1).toLowerCase();
        if (file.contains("partner") || file.contains("nyitas") || file.contains("megujulas")
                || file.contains("hatosagi") || file.contains("letenye") || file.contains("paks")) {
            return;
        }
        String url = "https://www.spar.hu" + path;
        papers.putIfAbsent(path, new DiscoveredPaper(
                "spar",
                humanizeSlug(file.replace(".pdf", "")),
                "https://www.spar.hu/ajanlatok",
                url,
                "spar:" + path,
                start,
                start.plusDays(6)
        ));
    }

    private DiscoveredPaper pennyRewePaper(int year, int week) {
        String stamp = year + String.format("%02d", week);
        LocalDate thursday = LocalDate.of(year, 1, 4)
                .with(WeekFields.ISO.weekOfWeekBasedYear(), week)
                .with(DayOfWeek.THURSDAY);
        return new DiscoveredPaper(
                "penny",
                "PENNY " + week + ". heti reklámújság",
                "https://files.rewe.co.at/PennyIntLeaflet/HU/" + stamp + "/",
                null,
                "penny:rewe:" + stamp,
                thursday,
                thursday.plusDays(6)
        );
    }

    static String htmlUnescape(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        Matcher matcher = HTML_ENTITY.matcher(raw);
        StringBuilder decoded = new StringBuilder();
        while (matcher.find()) {
            matcher.appendReplacement(
                    decoded,
                    Matcher.quoteReplacement(Character.toString(Integer.parseInt(matcher.group(1)))));
        }
        matcher.appendTail(decoded);
        return decoded.toString()
                .replace("&amp;", "&")
                .replace("&quot;", "\"")
                .replace("&nbsp;", " ")
                .replace("&lt;", "<")
                .replace("&gt;", ">");
    }

    private static boolean isPennyLandingPage(String url) {
        String lower = url.toLowerCase();
        return lower.contains("penny.hu") && !lower.contains(".pdf") && !lower.contains("publitas");
    }
}

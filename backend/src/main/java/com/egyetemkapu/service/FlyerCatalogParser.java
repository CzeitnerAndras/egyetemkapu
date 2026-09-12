package com.egyetemkapu.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
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

    public record ParsedProduct(String name, int pageNumber, String imageUrl) {
    }

    public record TextRun(
            float x, float y, float width, float height, String text, String font, float fontSize) {

        public TextRun(float x, float y, float width, float height, String text) {
            this(x, y, width, height, text, "", 0f);
        }

        public float right() {
            return x + width;
        }

        public float bottom() {
            return y + height;
        }

        public float centerX() {
            return x + width / 2f;
        }

        float centerY() {
            return y + height / 2f;
        }
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
    private static final Pattern SPAR_CATALOG = Pattern.compile(
            "https?://(?:www\\.)?spar\\.hu/ajanlatok/(spar|interspar|spar-market)/(\\d{6}-\\d+-[a-z0-9-]+)",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern SPAR_CATALOG_PATH = Pattern.compile(
            "/ajanlatok/(spar|interspar|spar-market)/(\\d{6}-\\d+-[a-z0-9-]+)",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern PUBLITAS = Pattern.compile(
            "https://(?:(?:view(?:-private)?|cdn2?)\\.)?publitas\\.com/[^\"'\\s>]+",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern PENNY_VIEWER = Pattern.compile(
            "https://(?:szorolap\\.aldi\\.hu|(?:(?:view(?:-private)?|cdn2?)\\.)?publitas\\.com)/[^\"'\\s>]*",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern PENNY_PRODUCT = Pattern.compile(
            "(?is)<(?:h[1-4]|p|span|div)[^>]*>\\s*([^<]{3,120}?)\\s*</(?:h[1-4]|p|span|div)>\\s*"
                    + "[^<]{0,180}?(\\d[\\d\\s.]{0,8}\\s*Ft)");
    private static final Pattern PRICE_TOKEN = Pattern.compile(
            "(?:\\d{1,3}(?:[ .]\\d{3})+|\\d{1,6})(?:[,]\\d{1,2})?\\s*(?:Ft(?:/[\\p{L}0-9]+)?|,-)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    private static final Pattern WEIGHT_TOKEN = Pattern.compile(
            "(?i)\\d+[\\d.,]*\\s*(?:g|kg|dkg|ml|cl|dl|l)\\s*/\\s*(?:csomag|darab|doboz|db)");
    private static final Pattern WEIGHT_LINE = Pattern.compile(
            "(?i)^(?:\\d+[\\d.,]*)?\\s*(?:g|kg|dkg|ml|cl|dl|l|db|darab|csomag|doboz)(?:\\s*/\\s*\\p{L}+)?$");
    private static final Pattern ARTICLE_NUMBER = Pattern.compile("^\\d{5,8}$");
    private static final Pattern DISCLAIMER = Pattern.compile(
            "(?iu)(?:a\\s+)?term[eé]k\\s+a\\s+\\p{L}+\\s+áruházunkban\\s+nem\\s+kapható\\.?"
                    + "|%?\\s*penny\\s+kártya(?:\\s+nélkül)?"
                    + "|clubcard"
                    + "|made with flippingbook"
                    + "|\\+?\\s*visszaváltási díj[:.\\d\\s]*");
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
                papers.putIfAbsent(slug, aldiPaper(slug, url, today));
            }
        }
        if (papers.isEmpty()) {
            int week = today.get(WeekFields.ISO.weekOfWeekBasedYear());
            int year = today.get(WeekFields.ISO.weekBasedYear());
            String slug = "aldi_online_akcios_ujsag_" + year + "_kw" + String.format("%02d", week);
            papers.putIfAbsent(slug, aldiPaper(
                    slug,
                    "https://szorolap.aldi.hu/" + slug + "/",
                    today));
        }
        return keepCurrentOrUpcoming(papers.values(), today);
    }

    public List<DiscoveredPaper> discoverSparPdfs(String html, LocalDate today) {
        Map<String, DiscoveredPaper> papers = new LinkedHashMap<>();
        for (DiscoveredPaper fallback : sparWeeklyFallbacks(today)) {
            papers.putIfAbsent(fallback.sourceKey(), fallback);
        }
        String haystack = html == null ? "" : html.replace("\\/", "/");
        addSparCatalogMatches(papers, SPAR_CATALOG.matcher(haystack));
        addSparCatalogMatches(papers, SPAR_CATALOG_PATH.matcher(haystack));
        addSparMatches(papers, SPAR_PDF.matcher(haystack), today);
        addSparMatches(papers, SPAR_PATH.matcher(haystack), today);
        return keepCurrentOrUpcoming(papers.values(), today);
    }

    public List<DiscoveredPaper> sparWeeklyFallbacks(LocalDate today) {
        List<DiscoveredPaper> papers = new ArrayList<>();
        LocalDate thursday = today.with(DayOfWeek.THURSDAY);
        if (thursday.isAfter(today)) {
            thursday = thursday.minusWeeks(1);
        }
        for (LocalDate start : List.of(thursday, thursday.plusWeeks(1))) {
            papers.add(sparCatalogPaper("spar", start, "1-spar-szorolap", "SPAR szórólap"));
            papers.add(sparCatalogPaper("interspar", start, "2-interspar-szorolap", "INTERSPAR szórólap"));
            papers.add(sparCatalogPaper("spar-market", start, "3-spar-market-city-spar", "SPAR Market"));
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
            Matcher viewers = PENNY_VIEWER.matcher(html.replace("\\/", "/"));
            while (viewers.find() && papers.size() < 8) {
                addPennyViewer(papers, viewers.group(), today);
            }
            Matcher publitas = PUBLITAS.matcher(html.replace("\\/", "/"));
            while (publitas.find() && papers.size() < 8) {
                addPennyViewer(papers, publitas.group(), today);
            }
        }
        for (DiscoveredPaper fallback : pennyWeeklyFallbacks(today)) {
            papers.putIfAbsent(fallback.sourceKey(), fallback);
        }
        return keepCurrentOrUpcoming(papers.values(), today);
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

    public List<ParsedCatalog> parseTescoGraphql(String json, LocalDate today) {
        List<ParsedCatalog> catalogs = new ArrayList<>();
        if (json == null || json.isBlank()) {
            return catalogs;
        }
        try {
            JsonNode items = objectMapper.readTree(json).path("data").path("leaflets").path("items");
            if (!items.isArray()) {
                return catalogs;
            }
            for (JsonNode item : items) {
                ParsedCatalog catalog = tescoCatalog(item);
                if (catalog == null) {
                    continue;
                }
                if (!isCurrentOrUpcoming(catalog.paper().validFrom(), catalog.paper().validTo(), today)) {
                    continue;
                }
                catalogs.add(catalog);
            }
        } catch (Exception ignored) {
            return catalogs;
        }
        catalogs.sort(Comparator
                .comparingInt((ParsedCatalog catalog) -> tescoKind(tescoTypeOf(catalog.paper())))
                .thenComparing(catalog -> catalog.paper().validFrom(), Comparator.nullsLast(Comparator.naturalOrder())));
        return catalogs;
    }

    public String tescoGraphqlBody(LocalDate today) {
        com.fasterxml.jackson.databind.node.ObjectNode root = objectMapper.createObjectNode();
        root.put("operationName", "getValidLeafletList");
        root.put("query", tescoGraphqlQuery());
        com.fasterxml.jackson.databind.node.ObjectNode variables = root.putObject("variables");
        variables.put("country", "hu");
        variables.put("currentDate", today.atStartOfDay(java.time.ZoneOffset.UTC).toInstant().toString());
        return root.toString();
    }

    public String tescoGraphqlQuery() {
        return """
                query getValidLeafletList($country: CountryCode!, $currentDate: DateTime!) {
                  leaflets(options: { filter: { country: { eq: $country }, validTo: { after: $currentDate } } }) {
                    items {
                      id slug promoP1Name leafletUrl country validFrom validTo type
                      pages { pagePNG }
                    }
                    totalItems
                  }
                }
                """;
    }

    static int tescoPageNumber(String imageUrl, int fallback) {
        if (imageUrl != null) {
            Matcher matcher = Pattern.compile("\\.(\\d+)\\.jpe?g(?:\\?|$)", Pattern.CASE_INSENSITIVE).matcher(imageUrl);
            if (matcher.find()) {
                return Integer.parseInt(matcher.group(1));
            }
        }
        return fallback;
    }

    private ParsedCatalog tescoCatalog(JsonNode item) {
        String type = item.path("type").asText("");
        String folder = tescoFolder(type);
        if (folder == null) {
            return null;
        }
        String slug = item.path("slug").asText("");
        if (slug.isBlank()) {
            return null;
        }
        LocalDate from = tescoDate(item.path("validFrom").asText(null));
        LocalDate to = tescoDate(item.path("validTo").asText(null));
        String official = "https://www.tesco.hu/akciok/katalogusok/" + folder + "/" + slug + "/1";
        String pdf = FlyerUrlPolicy.allowedOrNull(textOr(item.path("leafletUrl"), null));
        String id = item.path("id").asText(slug);
        DiscoveredPaper paper = new DiscoveredPaper(
                "tesco",
                tescoTitle(type),
                official,
                pdf,
                "tesco:" + type + ":" + (from == null ? id : from),
                from,
                to
        );
        List<ParsedPage> pages = new ArrayList<>();
        JsonNode pageNodes = item.path("pages");
        if (pageNodes.isArray()) {
            int index = 1;
            for (JsonNode page : pageNodes) {
                String image = FlyerUrlPolicy.allowedOrNull(textOr(page.path("pagePNG"), null));
                if (image == null) {
                    continue;
                }
                pages.add(new ParsedPage(tescoPageNumber(image, index), image, ""));
                index++;
            }
        }
        pages.sort(Comparator.comparingInt(ParsedPage::pageNumber));
        return new ParsedCatalog(paper, pages, List.of());
    }

    static String tescoFolder(String type) {
        return switch (type == null ? "" : type.toUpperCase()) {
            case "HM" -> "hipermarket";
            case "SM" -> "szupermarket";
            case "CAT" -> "katalogus";
            default -> null;
        };
    }

    static String tescoTitle(String type) {
        return switch (type == null ? "" : type.toUpperCase()) {
            case "HM" -> "Tesco Hipermarket";
            case "SM" -> "Tesco Szupermarket";
            case "CAT" -> "Tesco Katalógus";
            default -> "Tesco újság";
        };
    }

    static int tescoKind(String type) {
        return switch (type == null ? "" : type.toUpperCase()) {
            case "HM" -> 0;
            case "SM" -> 1;
            case "CAT" -> 2;
            default -> 9;
        };
    }

    static String tescoTypeOf(DiscoveredPaper paper) {
        if (paper.sourceKey() != null) {
            String[] parts = paper.sourceKey().split(":");
            if (parts.length >= 2) {
                return parts[1];
            }
        }
        return "";
    }

    private static LocalDate tescoDate(String iso) {
        if (iso == null || iso.isBlank()) {
            return null;
        }
        try {
            return OffsetDateTime.parse(iso).atZoneSameInstant(ZoneId.of("Europe/Budapest")).toLocalDate();
        } catch (Exception ignored) {
            try {
                return Instant.parse(iso).atZone(ZoneId.of("Europe/Budapest")).toLocalDate();
            } catch (Exception ignoredAgain) {
                return null;
            }
        }
    }

    public ParsedCatalog parsePennyLeaflet(DiscoveredPaper paper, String html) {
        String title = extractPennyTitle(html);
        if (title.isBlank()) {
            title = paper.title();
        }
        List<String> paragraphs = extractPennyParagraphs(html);
        int pageCount = Math.max(countPennyPages(html), paragraphs.size());
        List<ParsedPage> pages = new ArrayList<>();
        List<ParsedProduct> products = new ArrayList<>();
        for (int page = 1; page <= pageCount; page++) {
            String text = page <= paragraphs.size()
                    ? paragraphs.get(page - 1)
                    : page == 1 ? extractPennyPageText(html) : "";
            pages.add(new ParsedPage(page, pennyPageImageUrl(paper.officialUrl(), page), text));
            products.addAll(extractProductNames(text, page));
        }
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
        List<String> paragraphs = extractPennyParagraphs(html);
        if (!paragraphs.isEmpty()) {
            return paragraphs.getFirst();
        }
        return flattenPennyHtml(html);
    }

    public List<String> extractPennyParagraphs(String html) {
        if (html == null || html.isBlank() || html.contains("Code injection detected")) {
            return List.of();
        }
        String source = html;
        Matcher container = PENNY_TEXT.matcher(html);
        if (container.find()) {
            source = container.group(1);
        }
        source = source.replaceAll("(?is)<p class=\"powered-by\".*", "");
        List<String> paragraphs = new ArrayList<>();
        Matcher paragraph = Pattern.compile("(?is)<p(?![^>]*powered-by)[^>]*>(.*?)</p>").matcher(source);
        while (paragraph.find()) {
            String text = flattenPennyHtml(paragraph.group(1));
            if (!text.isBlank() && text.length() > 12) {
                paragraphs.add(text);
            }
        }
        return paragraphs;
    }

    private static String flattenPennyHtml(String html) {
        if (html == null || html.isBlank()) {
            return "";
        }
        String inner = html
                .replaceAll("(?is)<script.*?</script>", " ")
                .replaceAll("(?is)<br\\s*/?>", "\n")
                .replaceAll("(?is)</(?:p|h[1-6]|div|li|tr|dt|dd)>", "\n")
                .replaceAll("(?s)<[^>]+>", " ");
        return htmlUnescape(inner)
                .replaceAll("[\\t\\x0B\\f\\r ]+", " ")
                .replaceAll(" *\\n *", "\n")
                .replaceAll("\\n{3,}", "\n\n")
                .trim();
    }

    public static String pennyPageImageUrl(String leafletUrl, int pageNumber) {
        if (leafletUrl == null || leafletUrl.isBlank()) {
            return null;
        }
        String base = leafletUrl.endsWith("/") ? leafletUrl : leafletUrl + "/";
        return base + "files/assets/common/page-html5-substrates/page"
                + String.format("%04d", pageNumber) + "_2.jpg";
    }

    public static String pennyTextLayerUrl(String imageUrl) {
        if (imageUrl == null || !imageUrl.contains("page-html5-substrates/page")) {
            return null;
        }
        return imageUrl
                .replace("page-html5-substrates/", "page-textlayers/")
                .replaceFirst("page(\\d{4})_\\d+\\.jpe?g$", "page$1_1.png");
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
                String downloaded = textOr(data.path("config").path("downloadPdfUrl"), null);
                if (FlyerUrlPolicy.isAllowed(downloaded)) {
                    pdfUrl = downloaded;
                } else if (!FlyerUrlPolicy.isAllowed(pdfUrl)) {
                    pdfUrl = null;
                }
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
                                collectProducts(page, number, products, paper.officialUrl());
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
            if (name.length() < 3 || name.contains("{") || name.contains("http") || isWeakProductName(name)) {
                continue;
            }
            products.putIfAbsent(HungarianText.normalize(name), new ParsedProduct(name, 1, null));
        }
        return new ArrayList<>(products.values());
    }

    public List<ParsedProduct> extractProductNames(String text, int pageNumber) {
        LinkedHashMap<String, ParsedProduct> products = new LinkedHashMap<>();
        if (text == null || text.isBlank()) {
            return List.of();
        }
        text = clipConcatenatedPennyLeaflet(text);
        for (String rawLine : prepareFlyerText(text).split("\\R")) {
            addNamedProduct(products, stripPrices(rawLine), pageNumber);
            if (products.size() >= 80) {
                break;
            }
        }
        return keepPresentableProducts(new ArrayList<>(products.values()));
    }

    public List<ParsedProduct> extractProductNamesFromLayout(List<TextRun> runs, int pageNumber) {
        if (runs == null || runs.isEmpty()) {
            return List.of();
        }
        LinkedHashMap<String, ParsedProduct> products = new LinkedHashMap<>();
        for (TextRun token : mergeLayoutTokens(runs)) {
            if (isLayoutNameToken(token)) {
                addNamedProduct(products, token.text(), pageNumber);
            }
            if (products.size() >= 80) {
                break;
            }
        }
        return keepPresentableProducts(new ArrayList<>(products.values()));
    }

    public static boolean shouldReplaceStoredProducts(List<String> storedNames, List<ParsedProduct> parsed) {
        if (parsed == null || parsed.isEmpty()) {
            return false;
        }
        if (storedNames == null || storedNames.isEmpty()) {
            return true;
        }
        java.util.Set<String> storedKeys = new java.util.LinkedHashSet<>();
        storedNames.forEach(name -> storedKeys.add(HungarianText.normalize(name)));
        java.util.Set<String> parsedKeys = new java.util.LinkedHashSet<>();
        parsed.forEach(product -> parsedKeys.add(HungarianText.normalize(product.name())));
        return !storedKeys.equals(parsedKeys);
    }

    public static boolean isCurrentlyValid(LocalDate from, LocalDate to, LocalDate today) {
        if (today == null) {
            return true;
        }
        if (from != null && from.isAfter(today)) {
            return false;
        }
        if (to != null && to.isBefore(today)) {
            return false;
        }
        return true;
    }

    public static boolean isCurrentOrUpcoming(LocalDate from, LocalDate to, LocalDate today) {
        if (today == null) {
            return true;
        }
        if (to != null && to.isBefore(today)) {
            return false;
        }
        return from == null || !from.isAfter(today.plusDays(8));
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
            if (!name.isBlank()) {
                products.putIfAbsent(HungarianText.normalize(name), new ParsedProduct(name, 1, null));
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

    private void collectProducts(JsonNode page, int pageNumber, List<ParsedProduct> products, String officialUrl) {
        page.findValues("products").forEach(list -> {
            if (!list.isArray()) {
                return;
            }
            for (JsonNode product : list) {
                String name = textOr(product.path("title"), textOr(product.path("name"), ""));
                if (name.isBlank() || isWeakProductName(name)) {
                    continue;
                }
                String image = resolveAssetUrl(
                        officialUrl, textOr(product.path("image"), textOr(product.path("image_link"), null)));
                products.add(new ParsedProduct(name, pageNumber, image));
            }
        });
        page.findValues("hotspots").forEach(list -> {
            if (!list.isArray()) {
                return;
            }
            for (JsonNode hotspot : list) {
                collectProducts(hotspot, pageNumber, products, officialUrl);
            }
        });
    }

    private String collectText(JsonNode page) {
        StringBuilder text = new StringBuilder();
        appendText(page.path("text"), text);
        appendText(page.path("ocrText"), text);
        return text.toString().trim();
    }

    private void appendText(JsonNode node, StringBuilder text) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return;
        }
        if (node.isTextual()) {
            String value = node.asText().replace('\u00a0', ' ').trim();
            if (!value.isEmpty()) {
                if (!text.isEmpty()) {
                    text.append(value.contains("\n") || text.toString().endsWith("\n") ? '\n' : ' ');
                }
                text.append(value);
            }
        } else if (node.isArray()) {
            for (JsonNode child : node) {
                if (!text.isEmpty() && text.charAt(text.length() - 1) != '\n') {
                    text.append('\n');
                }
                appendText(child, text);
            }
        } else if (node.isObject()) {
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
            return FlyerUrlPolicy.allowedOrNull(resolved.toString());
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

    private void addSparCatalogMatches(Map<String, DiscoveredPaper> papers, Matcher matcher) {
        while (matcher.find()) {
            addSparCatalog(papers, matcher.group(1), matcher.group(2));
        }
    }

    private void addSparCatalog(Map<String, DiscoveredPaper> papers, String brand, String slug) {
        if (brand == null || slug == null || slug.length() < 8) {
            return;
        }
        String brandKey = brand.toLowerCase();
        try {
            LocalDate start = LocalDate.parse("20" + slug.substring(0, 6), DateTimeFormatter.ofPattern("yyyyMMdd"));
            String title = switch (brandKey) {
                case "interspar" -> "INTERSPAR szórólap";
                case "spar-market" -> "SPAR Market";
                default -> "SPAR szórólap";
            };
            String slugTail = slug.substring(7);
            if (!isWeeklySparSlug(brandKey, slugTail)) {
                return;
            }
            papers.putIfAbsent(sparSourceKey(brandKey, start), sparCatalogPaper(brandKey, start, slugTail, title));
        } catch (Exception ignored) {
            // Ignore malformed catalogue slugs.
        }
    }

    private DiscoveredPaper sparCatalogPaper(String brand, LocalDate start, String slugTail, String title) {
        String yyMMdd = start.format(DateTimeFormatter.ofPattern("yyMMdd"));
        String official = "https://www.spar.hu/ajanlatok/" + brand + "/" + yyMMdd + "-" + slugTail;
        String pdf = sparPdfCandidates(brand, start).getFirst();
        return new DiscoveredPaper(
                "spar",
                title,
                official,
                pdf,
                sparSourceKey(brand, start),
                start,
                start.plusDays(6)
        );
    }

    public List<String> sparPdfCandidates(String brand, LocalDate start) {
        String mmdd = start.format(DateTimeFormatter.ofPattern("MMdd"));
        String folder = "https://www.spar.hu/content/dam/sparhuwebsite/_flyers/"
                + start.format(DateTimeFormatter.ofPattern("yyyy/MMdd")) + "/";
        return switch (brand) {
            case "interspar" -> List.of(
                    folder + "interspar-szorolap" + mmdd + "p.pdf",
                    folder + "interspar-szorolap-" + mmdd + "p.pdf"
            );
            case "spar-market" -> List.of(
                    folder + "spar-market-cityspar" + mmdd + ".pdf",
                    folder + "spar-market-" + mmdd + "p.pdf"
            );
            default -> List.of(
                    folder + "spar-szorolap-" + mmdd + "p.pdf",
                    folder + "spar-szorolap" + mmdd + "p.pdf"
            );
        };
    }

    static String sparBrandOf(DiscoveredPaper paper) {
        if (paper.sourceKey() != null) {
            String[] parts = paper.sourceKey().split(":");
            if (parts.length >= 2 && !parts[1].isBlank()) {
                return parts[1];
            }
        }
        return "spar";
    }

    private static boolean isWeeklySparSlug(String brand, String slugTail) {
        if (brand == null || slugTail == null || isNonWeeklySpar(slugTail)) {
            return false;
        }
        String tail = slugTail.toLowerCase();
        return switch (brand.toLowerCase()) {
            case "spar" -> tail.matches("\\d+-spar-szorolap(?:-p)?");
            case "interspar" -> tail.matches("\\d+-interspar-szorolap(?:-p)?");
            case "spar-market" -> tail.matches("\\d+-spar-market-city-spar");
            default -> false;
        };
    }

    private static boolean isNonWeeklySpar(String value) {
        String lower = value.toLowerCase();
        return lower.contains("partner") || lower.contains("nyitas") || lower.contains("megujulas")
                || lower.contains("hatosagi") || lower.contains("letenye") || lower.contains("paks")
                || lower.contains("allat") || lower.contains("bor-") || lower.contains("katalogus")
                || lower.contains("torokbalint") || lower.contains("uzlet");
    }

    private static String sparSourceKey(String brand, LocalDate start) {
        return "spar:" + brand + ":" + start;
    }

    private void addSparMatches(Map<String, DiscoveredPaper> papers, Matcher matcher, LocalDate today) {
        while (matcher.find()) {
            addSparPaper(papers, matcher.group(1), today);
        }
    }

    private void addSparPaper(Map<String, DiscoveredPaper> papers, String path, LocalDate start) {
        String file = path.substring(path.lastIndexOf('/') + 1).toLowerCase();
        if (isNonWeeklySpar(file)) {
            return;
        }
        String brand = sparBrandFromFile(file);
        if (brand == null) {
            return;
        }
        LocalDate from = start;
        Matcher folder = Pattern.compile("/(20\\d{2})/(\\d{4})/").matcher(path);
        if (folder.find()) {
            try {
                from = LocalDate.parse(folder.group(1) + folder.group(2), DateTimeFormatter.ofPattern("yyyyMMdd"));
            } catch (Exception ignored) {
                from = start;
            }
        }
        String pdfUrl = "https://www.spar.hu" + path;
        DiscoveredPaper incoming = sparCatalogPaper(brand, from, sparSlugTail(brand), sparTitle(brand));
        incoming = new DiscoveredPaper(
                incoming.store(),
                incoming.title(),
                incoming.officialUrl(),
                pdfUrl,
                incoming.sourceKey(),
                incoming.validFrom(),
                incoming.validTo());
        papers.merge(incoming.sourceKey(), incoming, (existing, next) -> new DiscoveredPaper(
                existing.store(),
                existing.title(),
                existing.officialUrl(),
                next.pdfUrl(),
                existing.sourceKey(),
                existing.validFrom(),
                existing.validTo()));
    }

    private static String sparBrandFromFile(String file) {
        if (file.contains("interspar")) {
            return "interspar";
        }
        if (file.contains("spar-market")) {
            return "spar-market";
        }
        if (file.contains("spar-szorolap") || file.contains("szorolap")) {
            return "spar";
        }
        return null;
    }

    private static String sparSlugTail(String brand) {
        return switch (brand) {
            case "interspar" -> "2-interspar-szorolap";
            case "spar-market" -> "3-spar-market-city-spar";
            default -> "1-spar-szorolap";
        };
    }

    private static String sparTitle(String brand) {
        return switch (brand) {
            case "interspar" -> "INTERSPAR szórólap";
            case "spar-market" -> "SPAR Market";
            default -> "SPAR szórólap";
        };
    }

    private static List<DiscoveredPaper> keepCurrentOrUpcoming(
            java.util.Collection<DiscoveredPaper> papers, LocalDate today) {
        List<DiscoveredPaper> kept = new ArrayList<>();
        for (DiscoveredPaper paper : papers) {
            if (isCurrentOrUpcoming(paper.validFrom(), paper.validTo(), today)) {
                kept.add(paper);
            }
        }
        return kept;
    }

    private DiscoveredPaper aldiPaper(String slug, String url, LocalDate today) {
        LocalDate[] range = aldiValidity(slug, today);
        return new DiscoveredPaper(
                "aldi",
                humanizeSlug(slug),
                url,
                null,
                "aldi:" + slug,
                range[0],
                range[1]
        );
    }

    static LocalDate[] aldiValidity(String slug, LocalDate today) {
        if (slug != null) {
            Matcher ymd = Pattern.compile("(20\\d{2})_(\\d{2})_(\\d{2})").matcher(slug);
            if (ymd.find()) {
                LocalDate from = LocalDate.of(
                        Integer.parseInt(ymd.group(1)),
                        Integer.parseInt(ymd.group(2)),
                        Integer.parseInt(ymd.group(3)));
                return new LocalDate[] { from, from.plusDays(6) };
            }
            Matcher kw = Pattern.compile("(20\\d{2}).*?kw(\\d{1,2})").matcher(slug);
            if (kw.find()) {
                LocalDate thursday = isoWeekThursday(Integer.parseInt(kw.group(1)), Integer.parseInt(kw.group(2)));
                return new LocalDate[] { thursday, thursday.plusDays(6) };
            }
            Matcher het = Pattern.compile("(?:^|_)(\\d{1,2})_het(?:_|$)").matcher(slug);
            if (het.find()) {
                int year = today.get(WeekFields.ISO.weekBasedYear());
                LocalDate thursday = isoWeekThursday(year, Integer.parseInt(het.group(1)));
                return new LocalDate[] { thursday, thursday.plusDays(6) };
            }
        }
        return new LocalDate[] { today.minusDays(3), today.plusDays(4) };
    }

    static LocalDate isoWeekThursday(int weekBasedYear, int week) {
        return LocalDate.of(weekBasedYear, 1, 4)
                .with(WeekFields.ISO.weekOfWeekBasedYear(), week)
                .with(DayOfWeek.THURSDAY);
    }

    private DiscoveredPaper pennyRewePaper(int year, int week) {
        String stamp = year + String.format("%02d", week);
        LocalDate thursday = isoWeekThursday(year, week);
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

    static String clipConcatenatedPennyLeaflet(String text) {
        if (text == null || text.isBlank()) {
            return text;
        }
        Matcher marker = Pattern.compile("(?iu)\\bpenny\\.hu\\s+\\d+").matcher(text);
        if (marker.find() && marker.start() > 40) {
            return text.substring(0, marker.start()).trim();
        }
        return text;
    }

    private static String prepareFlyerText(String text) {
        String prepared = text.replace('\u00a0', ' ');
        prepared = coalesceSplitPrices(prepared);
        prepared = insertBreaksAfter(WEIGHT_TOKEN, prepared);
        prepared = insertBreaksAfter(PRICE_TOKEN, prepared);
        return prepared;
    }

    private static String coalesceSplitPrices(String text) {
        String[] raw = text.split("\\R", -1);
        List<String> lines = new ArrayList<>();
        for (String line : raw) {
            lines.add(line.replace('\u00a0', ' ').replaceAll("[\\t ]+", " ").trim());
        }
        List<Integer> numbers = new ArrayList<>();
        List<Integer> fts = new ArrayList<>();
        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);
            if (line.matches("\\d{2,4}") || line.matches("\\d{1,3}[ .]\\d{3}")) {
                numbers.add(i);
            } else if (line.matches("(?i)Ft(?:/[\\p{L}0-9]+)?")) {
                fts.add(i);
            }
        }
        if (fts.isEmpty() || numbers.isEmpty()) {
            return String.join("\n", lines);
        }
        if (numbers.size() == fts.size() * 2) {
            for (int i = 0; i < fts.size(); i++) {
                String ft = lines.get(fts.get(i));
                int first = numbers.get(i * 2);
                int second = numbers.get(i * 2 + 1);
                lines.set(first, lines.get(first) + " " + ft);
                lines.set(second, lines.get(second) + " " + ft);
                lines.set(fts.get(i), "");
            }
        } else {
            int n = Math.min(numbers.size(), fts.size());
            for (int i = 0; i < n; i++) {
                int numberAt = numbers.get(i);
                int ftAt = fts.get(i);
                lines.set(numberAt, lines.get(numberAt) + " " + lines.get(ftAt));
                lines.set(ftAt, "");
            }
        }
        return String.join("\n", lines);
    }

    private static int wordCount(String name) {
        if (name == null || name.isBlank()) {
            return 0;
        }
        return name.trim().split("\\s+").length;
    }

    private static List<TextRun> mergeLayoutTokens(List<TextRun> runs) {
        List<TextRun> sorted = new ArrayList<>(runs);
        sorted.sort(Comparator
                .comparingDouble((TextRun run) -> Math.round(run.y() / 3f) * 3)
                .thenComparingDouble(TextRun::x));
        List<TextRun> tokens = new ArrayList<>();
        TextRun current = null;
        for (TextRun run : sorted) {
            String piece = run.text() == null ? "" : run.text().replace('\u00a0', ' ').trim();
            if (piece.isBlank()) {
                continue;
            }
            if (current == null) {
                current = new TextRun(run.x(), run.y(), run.width(), run.height(), piece, run.font(), run.fontSize());
                continue;
            }
            boolean sameLine = Math.abs(run.y() - current.y()) <= 5;
            float gap = run.x() - (current.x() + current.width());
            if (sameLine && gap >= -2 && gap <= 10) {
                float right = Math.max(current.x() + current.width(), run.x() + run.width());
                float bottom = Math.max(current.y() + current.height(), run.y() + run.height());
                String joiner = shouldJoinWithSpace(current.text(), piece, gap) ? " " : "";
                current = new TextRun(
                        current.x(),
                        Math.min(current.y(), run.y()),
                        right - current.x(),
                        bottom - Math.min(current.y(), run.y()),
                        current.text() + joiner + piece,
                        current.font(),
                        current.fontSize());
            } else {
                tokens.add(current);
                current = new TextRun(run.x(), run.y(), run.width(), run.height(), piece, run.font(), run.fontSize());
            }
        }
        if (current != null) {
            tokens.add(current);
        }
        return tokens;
    }

    private static boolean isLayoutNameToken(TextRun token) {
        if (token == null || token.text() == null || PRICE_TOKEN.matcher(token.text()).find()) {
            return false;
        }
        if (isSkippableLine(token.text()) || isQuantityBadge(token.text()) || isJunkPricedLine(token.text())
                || isSloganName(token.text())) {
            return false;
        }
        String name = cleanProductName(token.text());
        return !name.isBlank() && looksLikeProductName(name) && !isDescriptionFragment(name)
                && !isWeakProductName(name);
    }

    private static String insertBreaksAfter(Pattern pattern, String text) {
        Matcher matcher = pattern.matcher(text);
        StringBuilder out = new StringBuilder();
        while (matcher.find()) {
            matcher.appendReplacement(out, Matcher.quoteReplacement(matcher.group() + "\n"));
        }
        matcher.appendTail(out);
        return out.toString();
    }

    private static void addNamedProduct(Map<String, ParsedProduct> products, String raw, int pageNumber) {
        String name = cleanProductName(raw);
        if (name.isBlank() || isSkippableLine(name) || !looksLikeProductName(name)
                || isDescriptionFragment(name) || isWeakProductName(name) || isSloganName(name)) {
            return;
        }
        products.putIfAbsent(HungarianText.normalize(name), new ParsedProduct(name, pageNumber, null));
    }

    private static String stripPrices(String line) {
        if (line == null) {
            return "";
        }
        return PRICE_TOKEN.matcher(line.replace('\u00a0', ' '))
                .replaceAll(" ")
                .replaceAll("[\\t ]+", " ")
                .trim();
    }

    private static boolean isSkippableLine(String line) {
        if (isWeightOrUnitLine(line) || ARTICLE_NUMBER.matcher(line).matches()) {
            return true;
        }
        String lower = line.toLowerCase(Locale.ROOT);
        if (isDisclaimerLine(lower)) {
            return true;
        }
        return lower.matches("(?iu)^(?:csak|akció%?|szuper\\s*ár!?|el[oöő]sz[oöő]r(?:\\s+nálunk!?)?|bbq|spórolás)$")
                || line.matches("(?i)^/?(?:csomag|doboz|darab|kg|db|l)$")
                || isJunkPricedLine(line)
                || isSloganName(line)
                || isDescriptionFragment(line);
    }

    private static boolean isJunkPricedLine(String line) {
        if (line == null || line.isBlank()) {
            return false;
        }
        String lower = line.toLowerCase(Locale.ROOT);
        return isDateLeadIn(lower) || lower.matches("(?iu)^\\d+\\s*(?:liter|l)\\b.*");
    }

    private static boolean isQuantityBadge(String line) {
        String lower = line.toLowerCase(Locale.ROOT);
        return lower.contains("db-tól")
                || lower.contains("db-től")
                || lower.contains("cs.-tól")
                || lower.startsWith("frissen sütve")
                || lower.matches("(?iu)^\\d+\\s*(?:db|cs\\.?|darab)[- .]*t[oóöő]l$");
    }

    private static boolean isDateLeadIn(String lower) {
        return lower.matches(
                "(?iu)^\\d{1,2}\\s*[.]?\\s*\\d{1,2}\\s*[.]?.*(?:szerda|csütörtök|péntek|szombat|vasárnap|hétfő|kedd).*")
                || lower.matches(
                "(?iu)^\\d{1,2}\\s+\\d{1,2}\\s*[.]?\\s*[-.,]*\\s*\\d{1,2}\\s*[.]?.*(?:szerda|csütörtök|péntek|szombat|vasárnap|hétfő|kedd).*");
    }

    private static boolean isWeightOrUnitLine(String line) {
        String compact = line.replace(" ", "");
        if (WEIGHT_LINE.matcher(line).matches() || WEIGHT_LINE.matcher(compact).matches()) {
            return true;
        }
        String lower = line.toLowerCase(Locale.ROOT);
        return lower.matches("(?iu)^(?:1\\s*kg|frissen sütve\\b.*|db[- ]*t[oóöő]l)$");
    }

    private static boolean isDisclaimerLine(String lower) {
        return lower.contains("nem kapható")
                || lower.contains("áruházunkban")
                || lower.contains("kártya")
                || lower.contains("clubcard")
                || lower.contains("szuper ár")
                || lower.contains("flippingbook")
                || lower.contains("újdonság")
                || lower.contains("ajánlat")
                || lower.contains("kártyá")
                || lower.contains("supershop")
                || lower.contains("készlet tart")
                || lower.contains("érvényes")
                || lower.contains("oldalon")
                || lower.contains("visszaváltási")
                || lower.contains("húspult")
                || lower.contains("vásárlásától")
                || lower.contains("kuponos")
                || lower.contains("mosás")
                || lower.contains("vigyél vissza")
                || lower.contains("db-tól")
                || lower.contains("db-től")
                || lower.contains("cs.-tól")
                || lower.contains("esetén")
                || lower.contains("nem tartalmazza")
                || lower.contains("feltüntetett")
                || lower.contains("visszaváltás")
                || lower.contains("töltsd le")
                || lower.contains("spórolás")
                || lower.contains("kupon")
                || lower.contains("tesco.hu")
                || lower.contains("nagybevásárlás")
                || lower.contains("váltható")
                || lower.contains("ruházható")
                || lower.contains("olcsóbb")
                || lower.contains("mostantól")
                || lower.contains("vigyél vissza")
                || lower.contains("ai által")
                || lower.contains("válogatva itthonról")
                || lower.matches("(?iu)^(?:.*pultban\\s+)?kapható\\.?$");
    }

    private static boolean looksLikeProductName(String name) {
        return !isWeakProductName(name) && name.matches(".*\\p{L}{3,}.*");
    }

    private static String cleanProductName(String name) {
        if (name == null || name.isBlank()) {
            return "";
        }
        String cleaned = name;
        cleaned = cleaned.replaceAll("(?iu)^azon melegében\\s*", " ");
        cleaned = cleaned.replaceAll("(?iu)^el[oö]sz[oö]r(?:\\s+nálunk!?)?\\s*", " ");
        cleaned = cleaned.replaceAll("(?iu)^kiszerelésben\\s*", " ");
        cleaned = cleaned.replaceAll("(?iu)^\\d+\\s*(?:liter|l)\\s+", " ");
        cleaned = DISCLAIMER.matcher(cleaned).replaceAll(" ");
        cleaned = cleaned.replaceAll("(?i)\\b\\d{5,8}\\b", " ");
        cleaned = cleaned.replaceAll("(?iu)(?:^|\\s)(?:csak|akció%?|szuper\\s*ár!?)(?=\\s|$)", " ");
        cleaned = cleaned.replaceAll("[-+]?\\d{1,3}\\s*%", " ");
        cleaned = cleaned.replaceAll("(?iu)\\d{1,2}\\.\\d{1,2}\\.?", " ");
        cleaned = cleaned.replaceAll(
                "(?iu)\\b(?:csütörtök\\p{L}*|szerdáig|vasárnapig|hétfő\\p{L}*|kedd\\p{L}*)\\b", " ");
        cleaned = WEIGHT_TOKEN.matcher(cleaned).replaceAll(" ");
        cleaned = cleaned.replaceAll("(?iu)\\s+\\d+[\\d.,]*\\s*(?:g|kg|dkg|ml|cl|dl|l)\\b", " ");
        cleaned = cleaned.replaceAll("^[\\s,.;:%/-]+", "").replaceAll("[\\s,.;:/-]+$", "");
        cleaned = cleaned.replaceAll("\\s+", " ").trim();
        String[] words = cleaned.split("\\s+");
        if (words.length > 8) {
            cleaned = String.join(" ", java.util.Arrays.copyOfRange(words, words.length - 8, words.length));
        }
        return cleaned;
    }

    private static boolean isDescriptionFragment(String name) {
        if (name == null || name.isBlank()) {
            return false;
        }
        String lower = name.toLowerCase(Locale.ROOT);
        return lower.equals("azon melegében")
                || (lower.startsWith("azon melegében") && wordCount(name) <= 2)
                || lower.startsWith("csont nélkül")
                || lower.contains("kiszolgálópult")
                || lower.contains("kiszerelésben is")
                || lower.equals("kiszerelésben")
                || lower.contains("spórolás")
                || lower.contains("töltsd le")
                || lower.contains("appot")
                || lower.contains("pici ár")
                || lower.contains("reklámújság")
                || lower.contains("töltőtömeg")
                || lower.startsWith("gyorsfagyasztott")
                || lower.startsWith("hámozott")
                || lower.endsWith("(")
                || lower.matches("(?iu)^\\d+\\s*(?:liter|l)\\b.*")
                || isDateLeadIn(lower);
    }

    /** Strips prices, dates, article numbers and badge words that cling to a product name. */
    public static String tidyProductName(String raw) {
        return cleanProductName(raw);
    }

    /** True when a candidate is fine print, a badge or a slogan rather than something buyable. */
    public static boolean isJunkProductName(String name) {
        return name == null || name.isBlank() || isSkippableLine(name) || !looksLikeProductName(name)
                || isDescriptionFragment(name) || isWeakProductName(name) || isSloganName(name);
    }

    public static boolean isWeakProductName(String name) {
        if (name == null) {
            return true;
        }
        String trimmed = name.replaceAll("\\s+", " ").trim();
        if (trimmed.length() < 3 || trimmed.contains("http")) {
            return true;
        }
        if (trimmed.startsWith("%")) {
            return true;
        }
        String lower = trimmed.toLowerCase(Locale.ROOT);
        if (isDisclaimerLine(lower)
                || lower.matches("(?iu)^(csomag|darab|doboz|db|db[- ]*t[oóöő]l|csak|akció)$")
                || lower.matches("(?iu)^\\d+\\s*(?:db|cs\\.?|darab|csomag)[- .]*t[oóöő]l$")
                || lower.matches("(?iu)^(aldi|penny|tesco|spar|interspar)$")
                || lower.contains("darab/készlet")
                || lower.contains("doboz díj")
                || lower.equals("díj")
                || lower.endsWith(" díj")
                || lower.contains("db/cs")
                || lower.startsWith("frissen sütve")
                || lower.startsWith("ft/")
                || isSloganName(trimmed)
                || isDescriptionFragment(trimmed)) {
            return true;
        }
        return lower.matches("^[\\d ./%gkgmlcsdbáéíóöőúüű-]+$");
    }

    public static boolean isSloganName(String name) {
        if (name == null || name.isBlank()) {
            return false;
        }
        String lower = name.toLowerCase(Locale.ROOT);
        return lower.contains("mostantól")
                || lower.contains("még több akció")
                || lower.contains("először")
                || lower.contains("olcsóbb")
                || lower.contains("szuper ár")
                || lower.contains("válogatva")
                || lower.contains("jégkrém-kiárusítás")
                || lower.contains("jégkrém kiárusítás")
                || lower.startsWith("akár")
                || lower.contains("pici ár")
                || lower.contains("töltsd")
                || lower.contains("appot")
                || lower.matches("(?iu)^ft[/ ].*")
                || lower.equals("bbq")
                || lower.contains("nagybevásárlás");
    }

    public static List<ParsedProduct> keepPresentableProducts(List<ParsedProduct> products) {
        if (products == null || products.isEmpty()) {
            return List.of();
        }
        List<ParsedProduct> kept = new ArrayList<>();
        for (ParsedProduct product : products) {
            if (product == null || isWeakProductName(product.name()) || isSloganName(product.name())) {
                continue;
            }
            kept.add(product);
        }
        return kept;
    }

    private static boolean shouldJoinWithSpace(String left, String right, float gap) {
        if (gap > 1.5f) {
            return true;
        }
        if (left == null || right == null || left.isBlank() || right.isBlank()) {
            return false;
        }
        char last = left.charAt(left.length() - 1);
        char first = right.charAt(0);
        return left.length() >= 2 && right.length() >= 2
                && Character.isLetter(last) && Character.isLetter(first);
    }

    private static boolean isPennyLandingPage(String url) {
        String lower = url.toLowerCase();
        return lower.contains("penny.hu") && !lower.contains(".pdf") && !lower.contains("publitas");
    }

    private void addPennyViewer(Map<String, DiscoveredPaper> papers, String url, LocalDate today) {
        if (!FlyerUrlPolicy.isAllowed(url) || isPennyLandingPage(url) || isPennyReweUrl(url)) {
            return;
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
}

package com.egyetemkapu.service;

import java.net.URI;
import java.util.Locale;
import java.util.Set;

public final class FlyerUrlPolicy {

    static final Set<String> ALLOWED_HOSTS = Set.of(
            "szorolap.aldi.hu",
            "publitas.com",
            "view.publitas.com",
            "view-private.publitas.com",
            "cdn.publitas.com",
            "cdn2.publitas.com",
            "www.spar.hu",
            "spar.hu",
            "www.penny.hu",
            "penny.hu",
            "files.rewe.co.at",
            "www.aldi.hu",
            "aldi.hu",
            "www.tesco.hu",
            "tesco.hu",
            "digitalcontent.api.tesco.com",
            "api.prod.retail.tesco.com"
    );

    static final int MAX_TEXT_CHARS = 4_000_000;
    static final int MAX_BINARY_BYTES = 60 * 1024 * 1024;
    static final int MAX_PDF_PAGES = 48;
    static final int MAX_IMAGE_EDGE = 4096;
    static final int MAX_REDIRECTS = 5;

    private FlyerUrlPolicy() {
    }

    public static boolean isAllowed(String url) {
        if (url == null || url.isBlank()) {
            return false;
        }
        try {
            URI uri = URI.create(url.trim());
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getUserInfo() != null) {
                return false;
            }
            String host = uri.getHost();
            if (host == null || host.isBlank()) {
                return false;
            }
            host = host.toLowerCase(Locale.ROOT);
            while (host.endsWith(".")) {
                host = host.substring(0, host.length() - 1);
            }
            return ALLOWED_HOSTS.contains(host);
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    public static String allowedOrNull(String url) {
        return isAllowed(url) ? url : null;
    }

    public static void assertAllowed(String url) {
        if (!isAllowed(url)) {
            throw new IllegalArgumentException("Ez a forrás nem engedélyezett.");
        }
    }
}

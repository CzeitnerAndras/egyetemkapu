package com.egyetemkapu.service;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
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
            "api.prod.retail.tesco.com",
            "auchan.hu",
            "www.auchan.hu",
            "reklamujsag.auchan.hu",
            "cdn.ipaper.io",
            "coop.hu",
            "www.coop.hu",
            "katalogus.coop.hu",
            "lidl.hu",
            "www.lidl.hu",
            "endpoints.leaflets.schwarz",
            "imgproxy.leaflets.schwarz",
            "assets.leaflets.schwarz"
    );

    static final int MAX_TEXT_CHARS = 4_000_000;
    static final int MAX_BINARY_BYTES = 80 * 1024 * 1024;
    static final int MAX_PDF_PAGES = 64;
    static final int MAX_IMAGE_EDGE = 4096;
    static final int MAX_REDIRECTS = 5;

    private FlyerUrlPolicy() {
    }

    // --- Allowlist ---
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

    public static void assertResolvesToPublicAddress(String url) {
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("Ez a forrás nem engedélyezett.");
        }
        String host;
        try {
            host = URI.create(url.trim()).getHost();
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Ez a forrás nem engedélyezett.");
        }
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("Ez a forrás nem engedélyezett.");
        }
        try {
            InetAddress[] addresses = InetAddress.getAllByName(host);
            if (addresses.length == 0) {
                throw new IllegalArgumentException("Ez a forrás nem engedélyezett.");
            }
            for (InetAddress address : addresses) {
                if (!isPublicAddress(address)) {
                    throw new IllegalArgumentException("Ez a forrás nem engedélyezett.");
                }
            }
        } catch (UnknownHostException ex) {
            throw new IllegalArgumentException("Ez a forrás nem engedélyezett.");
        }
    }

    static boolean isPublicAddress(InetAddress address) {
        if (address == null) {
            return false;
        }
        byte[] bytes = address.getAddress();
        if (bytes.length == 16 && isIpv4Mapped(bytes)) {
            try {
                byte[] v4 = new byte[] {bytes[12], bytes[13], bytes[14], bytes[15]};
                return isPublicAddress(InetAddress.getByAddress(v4));
            } catch (UnknownHostException ex) {
                return false;
            }
        }
        if (address.isAnyLocalAddress()
                || address.isLoopbackAddress()
                || address.isLinkLocalAddress()
                || address.isSiteLocalAddress()
                || address.isMulticastAddress()) {
            return false;
        }
        if (bytes.length == 16) {
            int first = bytes[0] & 0xff;
            if ((first & 0xfe) == 0xfc) {
                return false;
            }
        }
        if (bytes.length == 4) {
            int first = bytes[0] & 0xff;
            int second = bytes[1] & 0xff;
            if (first == 0 || first >= 240) {
                return false;
            }
            if (first == 100 && (second & 0xc0) == 64) {
                return false;
            }
            if (first == 198 && (second == 18 || second == 19)) {
                return false;
            }
        }
        return true;
    }

    private static boolean isIpv4Mapped(byte[] bytes) {
        for (int i = 0; i < 10; i++) {
            if (bytes[i] != 0) {
                return false;
            }
        }
        return bytes[10] == (byte) 0xff && bytes[11] == (byte) 0xff;
    }
}

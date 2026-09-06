package com.egyetemkapu.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.List;

@Component
public class ClientIpResolver {

    private final List<IpMatcher> trustedProxies;

    public ClientIpResolver(@Value("${app.trusted-proxies:127.0.0.1,::1}") String trustedProxies) {
        this.trustedProxies = parseTrusted(trustedProxies);
    }

    public String resolve(HttpServletRequest request) {
        String remote = normalize(request.getRemoteAddr());
        if (remote == null) {
            return "unknown";
        }
        if (!isTrusted(remote)) {
            return remote;
        }

        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded == null || forwarded.isBlank()) {
            return remote;
        }

        String[] hops = forwarded.split(",");
        for (int i = hops.length - 1; i >= 0; i--) {
            String hop = normalize(hops[i]);
            if (hop != null && !isTrusted(hop)) {
                return hop;
            }
        }

        String leftmost = normalize(hops[0]);
        return leftmost != null ? leftmost : remote;
    }

    boolean isTrusted(String ip) {
        for (IpMatcher matcher : trustedProxies) {
            if (matcher.matches(ip)) {
                return true;
            }
        }
        return false;
    }

    private static List<IpMatcher> parseTrusted(String csv) {
        List<IpMatcher> matchers = new ArrayList<>();
        if (csv == null || csv.isBlank()) {
            return matchers;
        }
        for (String part : csv.split(",")) {
            IpMatcher matcher = IpMatcher.parse(part.trim());
            if (matcher != null) {
                matchers.add(matcher);
            }
        }
        return List.copyOf(matchers);
    }

    static String normalize(String raw) {
        if (raw == null) {
            return null;
        }
        String value = raw.trim();
        if (value.isEmpty() || value.length() > 64) {
            return null;
        }
        if (value.startsWith("[") && value.contains("]")) {
            value = value.substring(1, value.indexOf(']'));
        } else if (value.indexOf('.') >= 0) {
            int colon = value.indexOf(':');
            if (colon > 0) {
                value = value.substring(0, colon);
            }
        }
        try {
            return InetAddress.getByName(value).getHostAddress();
        } catch (UnknownHostException ex) {
            return null;
        }
    }

    record IpMatcher(InetAddress network, int prefixLength) {

        static IpMatcher parse(String value) {
            if (value == null || value.isEmpty()) {
                return null;
            }
            try {
                String addressPart = value;
                Integer prefix = null;
                int slash = value.indexOf('/');
                if (slash >= 0) {
                    addressPart = value.substring(0, slash);
                    prefix = Integer.parseInt(value.substring(slash + 1));
                }
                InetAddress network = InetAddress.getByName(addressPart);
                int maxPrefix = network.getAddress().length * 8;
                int resolvedPrefix = prefix == null ? maxPrefix : prefix;
                if (resolvedPrefix < 0 || resolvedPrefix > maxPrefix) {
                    return null;
                }
                return new IpMatcher(network, resolvedPrefix);
            } catch (UnknownHostException | NumberFormatException ex) {
                return null;
            }
        }

        boolean matches(String ip) {
            try {
                InetAddress address = InetAddress.getByName(ip);
                byte[] net = network.getAddress();
                byte[] addr = address.getAddress();
                if (net.length != addr.length) {
                    return false;
                }
                int fullBytes = prefixLength / 8;
                int remainBits = prefixLength % 8;
                for (int i = 0; i < fullBytes; i++) {
                    if (net[i] != addr[i]) {
                        return false;
                    }
                }
                if (remainBits == 0) {
                    return true;
                }
                int mask = (0xFF << (8 - remainBits)) & 0xFF;
                return (net[fullBytes] & mask) == (addr[fullBytes] & mask);
            } catch (UnknownHostException ex) {
                return false;
            }
        }
    }
}

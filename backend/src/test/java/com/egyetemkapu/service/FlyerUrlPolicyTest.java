package com.egyetemkapu.service;

import org.junit.jupiter.api.Test;

import java.net.InetAddress;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FlyerUrlPolicyTest {

    @Test
    void allowsOfficialRetailerHttpsHosts() {
        assertTrue(FlyerUrlPolicy.isAllowed("https://szorolap.aldi.hu/x/"));
        assertTrue(FlyerUrlPolicy.isAllowed("https://view.publitas.com/penny/ok"));
        assertTrue(FlyerUrlPolicy.isAllowed("https://files.rewe.co.at/PennyIntLeaflet/HU/202636/"));
        assertTrue(FlyerUrlPolicy.isAllowed("https://www.spar.hu/content/dam/x.pdf"));
        assertTrue(FlyerUrlPolicy.isAllowed("https://digitalcontent.api.tesco.com/v2/media/x.jpeg"));
        assertTrue(FlyerUrlPolicy.isAllowed("https://api.prod.retail.tesco.com/marketing/leaflets-be/graphql"));
        assertTrue(FlyerUrlPolicy.isAllowed("https://auchan.hu/"));
        assertTrue(FlyerUrlPolicy.isAllowed("https://reklamujsag.auchan.hu/online-katalogusok/x/"));
        assertTrue(FlyerUrlPolicy.isAllowed("https://cdn.ipaper.io/iPaper/Papers/x/Pages/1/Zoom.jpg"));
        assertTrue(FlyerUrlPolicy.isAllowed("https://www.coop.hu/ajanlatkereso/"));
        assertTrue(FlyerUrlPolicy.isAllowed("https://katalogus.coop.hu/coop-alfold-szorolap-2026-szeptember-4-het/"));
        assertTrue(FlyerUrlPolicy.isAllowed(
                "https://www.coop.hu/wp-content/uploads/2026/09/coop_nyirzem_szorolap_20260924-0930.jpg"));
        assertTrue(FlyerUrlPolicy.isAllowed("https://www.lidl.hu/c/szorolap/s10013623"));
        assertTrue(FlyerUrlPolicy.isAllowed(
                "https://endpoints.leaflets.schwarz/v4/flyer?flyer_identifier=x"));
        assertTrue(FlyerUrlPolicy.isAllowed("https://imgproxy.leaflets.schwarz/x/page.jpg"));
        assertTrue(FlyerUrlPolicy.isAllowed("https://assets.leaflets.schwarz/leaflets/pdfs/x.pdf"));
        assertDoesNotThrow(() -> FlyerUrlPolicy.assertAllowed("https://www.penny.hu/ajanlatok"));
        assertTrue(FlyerUrlPolicy.MAX_BINARY_BYTES >= 40 * 1024 * 1024);
    }

    @Test
    void rejectsPrivateMetadataHttpAndForeignHosts() {
        assertFalse(FlyerUrlPolicy.isAllowed("https://169.254.169.254/publitas/x"));
        assertFalse(FlyerUrlPolicy.isAllowed("http://www.spar.hu/insecure.pdf"));
        assertFalse(FlyerUrlPolicy.isAllowed("https://ujsagomat.hu/stolen.pdf"));
        assertFalse(FlyerUrlPolicy.isAllowed("https://www.spar.hu.evil.example/x.pdf"));
        assertFalse(FlyerUrlPolicy.isAllowed("https://user:pass@www.spar.hu/x.pdf"));
        assertFalse(FlyerUrlPolicy.isAllowed("not a url"));
        assertNull(FlyerUrlPolicy.allowedOrNull("https://evil.example/x.jpg"));
        assertThrows(IllegalArgumentException.class,
                () -> FlyerUrlPolicy.assertAllowed("https://169.254.169.254/latest/meta-data/"));
    }

    @Test
    void rejectsPrivateAndLinkLocalAddressesAfterResolution() throws Exception {
        assertFalse(FlyerUrlPolicy.isPublicAddress(InetAddress.getByName("127.0.0.1")));
        assertFalse(FlyerUrlPolicy.isPublicAddress(InetAddress.getByName("10.1.2.3")));
        assertFalse(FlyerUrlPolicy.isPublicAddress(InetAddress.getByName("172.16.0.1")));
        assertFalse(FlyerUrlPolicy.isPublicAddress(InetAddress.getByName("192.168.1.1")));
        assertFalse(FlyerUrlPolicy.isPublicAddress(InetAddress.getByName("169.254.169.254")));
        assertFalse(FlyerUrlPolicy.isPublicAddress(InetAddress.getByName("100.64.0.1")));
        assertFalse(FlyerUrlPolicy.isPublicAddress(InetAddress.getByName("::1")));
        assertFalse(FlyerUrlPolicy.isPublicAddress(InetAddress.getByName("fc00::1")));
        assertFalse(FlyerUrlPolicy.isPublicAddress(InetAddress.getByName("fe80::1")));
        assertTrue(FlyerUrlPolicy.isPublicAddress(InetAddress.getByName("8.8.8.8")));
        assertThrows(IllegalArgumentException.class,
                () -> FlyerUrlPolicy.assertResolvesToPublicAddress("https://127.0.0.1/latest/meta-data/"));
        assertThrows(IllegalArgumentException.class,
                () -> FlyerUrlPolicy.assertResolvesToPublicAddress("https://169.254.169.254/"));
        assertDoesNotThrow(() -> FlyerUrlPolicy.assertResolvesToPublicAddress("https://8.8.8.8/dns"));
    }
}

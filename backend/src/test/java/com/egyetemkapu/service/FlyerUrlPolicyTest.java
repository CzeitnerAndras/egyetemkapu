package com.egyetemkapu.service;

import org.junit.jupiter.api.Test;

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
}

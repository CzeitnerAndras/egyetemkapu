package com.egyetemkapu.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class FlyerPageProxyServiceTest {

    @Test
    void allowsOfficialHostsOnly() {
        assertDoesNotThrow(() -> FlyerPageProxyService.assertAllowed("https://szorolap.aldi.hu/resize/page.jpg"));
        assertDoesNotThrow(() -> FlyerPageProxyService.assertAllowed("https://www.spar.hu/content/dam/x.pdf"));
        assertDoesNotThrow(() -> FlyerPageProxyService.assertAllowed(
                "https://files.rewe.co.at/PennyIntLeaflet/HU/202636/files/assets/common/page-html5-substrates/page0001_2.jpg"));
        assertThrows(IllegalArgumentException.class,
                () -> FlyerPageProxyService.assertAllowed("https://ujsagomat.hu/stolen.pdf"));
        assertThrows(IllegalArgumentException.class,
                () -> FlyerPageProxyService.assertAllowed("http://www.spar.hu/insecure.pdf"));
        assertDoesNotThrow(() -> FlyerPageProxyService.assertAllowed(
                "https://digitalcontent.api.tesco.com/v2/media/dotcom-sk/x/page.1.jpeg"));
    }
}

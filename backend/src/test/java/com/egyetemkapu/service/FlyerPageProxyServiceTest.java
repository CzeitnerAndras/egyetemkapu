package com.egyetemkapu.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class FlyerPageProxyServiceTest {

    @Test
    void allowsOfficialHostsOnly() {
        assertDoesNotThrow(() -> FlyerPageProxyService.assertAllowed("https://szorolap.aldi.hu/resize/page.jpg"));
        assertDoesNotThrow(() -> FlyerPageProxyService.assertAllowed("https://www.spar.hu/content/dam/x.pdf"));
        assertThrows(IllegalArgumentException.class,
                () -> FlyerPageProxyService.assertAllowed("https://ujsagomat.hu/stolen.pdf"));
        assertThrows(IllegalArgumentException.class,
                () -> FlyerPageProxyService.assertAllowed("http://www.spar.hu/insecure.pdf"));
    }
}

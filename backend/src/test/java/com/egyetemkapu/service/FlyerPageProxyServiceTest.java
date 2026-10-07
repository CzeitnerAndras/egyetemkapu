package com.egyetemkapu.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
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
        assertThrows(IllegalArgumentException.class,
                () -> FlyerPageProxyService.assertAllowed("https://169.254.169.254/publitas/x"));
        assertThrows(IllegalArgumentException.class,
                () -> FlyerPageProxyService.assertAllowed("https://user:pass@www.spar.hu/x.pdf"));
        assertDoesNotThrow(() -> FlyerPageProxyService.assertAllowed(
                "https://digitalcontent.api.tesco.com/v2/media/dotcom-sk/x/page.1.jpeg"));
        assertDoesNotThrow(() -> FlyerPageProxyService.assertAllowed(
                "https://cdn.ipaper.io/iPaper/Papers/0d13e120-58cb-4d20-bd32-6b5557475386/Pages/1/Zoom.jpg"));
    }

    @Test
    void imageTypeFollowsBytesNotARemoteHeader() {
        byte[] jpeg = new byte[32];
        jpeg[0] = (byte) 0xFF;
        jpeg[1] = (byte) 0xD8;
        jpeg[2] = (byte) 0xFF;
        assertEquals(MediaType.IMAGE_JPEG, FlyerPageProxyService.imageMediaType(jpeg));

        byte[] png = new byte[32];
        byte[] pngMagic = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        System.arraycopy(pngMagic, 0, png, 0, pngMagic.length);
        assertEquals(MediaType.IMAGE_PNG, FlyerPageProxyService.imageMediaType(png));

        byte[] html = "<html><script>alert(1)</script></html>".getBytes();
        assertThrows(IllegalArgumentException.class, () -> FlyerPageProxyService.imageMediaType(html));
    }
}

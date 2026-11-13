package com.egyetemkapu.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

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
    void auchanSignatureIsDroppedShortlyBeforeItExpires() {
        Instant now = Instant.ofEpochSecond(1_700_000_000);
        String live = "https://cdn.ipaper.io/iPaper/Papers/x/Pages/1/Zoom.jpg?token=abc&expires="
                + now.plusSeconds(3600).getEpochSecond();
        String dying = "https://cdn.ipaper.io/iPaper/Papers/x/Pages/1/Zoom.jpg?token=abc&expires="
                + now.plusSeconds(60).getEpochSecond();
        assertTrue(FlyerPageProxyService.signedUrlUsable(live, now));
        assertFalse(FlyerPageProxyService.signedUrlUsable(dying, now));
        assertFalse(FlyerPageProxyService.signedUrlUsable(null, now));
        assertTrue(FlyerPageProxyService.signedUrlUsable("https://cdn.ipaper.io/plain.jpg", now));
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

    @Test
    void overlaySkipsAnImagePastTheEdgeCap() throws Exception {
        byte[] wide = png(FlyerUrlPolicy.MAX_IMAGE_EDGE + 1, 1);
        byte[] small = png(8, 8);
        assertEquals(0, FlyerPageProxyService.overlayImages(wide, small).length);
        assertTrue(FlyerPageProxyService.overlayImages(small, small).length > 32);
    }

    private static byte[] png(int width, int height) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }
}

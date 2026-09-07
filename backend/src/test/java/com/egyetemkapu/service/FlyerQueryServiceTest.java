package com.egyetemkapu.service;

import com.egyetemkapu.dto.FlyerSearchHitDto;
import com.egyetemkapu.model.Flyer;
import com.egyetemkapu.model.FlyerPage;
import com.egyetemkapu.model.FlyerProduct;
import com.egyetemkapu.repository.FlyerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FlyerQueryServiceTest {

    @Mock private FlyerRepository flyerRepository;
    @Mock private FlyerSyncService flyerSyncService;

    private FlyerQueryService service;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-09-06T10:00:00Z"), ZoneId.of("Europe/Budapest"));
        service = new FlyerQueryService(flyerRepository, flyerSyncService, clock);
    }

    @Test
    void searchFindsAccentInsensitiveProductAndRefreshesWhenStale() {
        Flyer flyer = flyerWithProduct("Kakaóscsiga", "249 Ft");
        when(flyerSyncService.isStale(LocalDateTime.of(2026, 9, 6, 12, 0))).thenReturn(true);
        when(flyerRepository.findAllByOrderByStoreAscTitleAsc()).thenReturn(List.of(flyer));

        List<FlyerSearchHitDto> hits = service.search("kakaoscsiga");

        assertEquals(1, hits.size());
        assertEquals("Kakaóscsiga", hits.getFirst().productName());
        assertEquals("product", hits.getFirst().kind());
        verify(flyerSyncService).refreshAsync();
    }

    @Test
    void searchFindsPageTextWhenProductNameIsMissing() {
        Flyer flyer = new Flyer();
        flyer.setId(8L);
        flyer.setStore("spar");
        flyer.setTitle("SPAR szórólap");
        FlyerPage page = new FlyerPage();
        page.setPageNumber(4);
        page.setPageText("Ajánlat: kakaóscsiga a pékpultnál");
        flyer.addPage(page);
        when(flyerSyncService.isStale(LocalDateTime.of(2026, 9, 6, 12, 0))).thenReturn(false);
        when(flyerRepository.findAllByOrderByStoreAscTitleAsc()).thenReturn(List.of(flyer));

        List<FlyerSearchHitDto> hits = service.search("kakaóscsiga");

        assertEquals(1, hits.size());
        assertEquals("page", hits.getFirst().kind());
        assertEquals(4, hits.getFirst().pageNumber());
        assertTrue(hits.getFirst().snippet().toLowerCase().contains("kakaóscsiga"));
    }

    @Test
    void blankQueryReturnsNothing() {
        assertTrue(service.search("   ").isEmpty());
    }

    private static Flyer flyerWithProduct(String name, String price) {
        Flyer flyer = new Flyer();
        flyer.setId(3L);
        flyer.setStore("aldi");
        flyer.setTitle("ALDI heti újság");
        FlyerProduct product = new FlyerProduct();
        product.setId(11L);
        product.setName(name);
        product.setPriceText(price);
        product.setPageNumber(2);
        flyer.addProduct(product);
        return flyer;
    }
}

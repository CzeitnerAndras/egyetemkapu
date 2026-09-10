package com.egyetemkapu.service;

import com.egyetemkapu.dto.FlyerSearchHitDto;
import com.egyetemkapu.dto.FlyerSummaryDto;
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
import java.time.LocalDate;
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

    @Test
    void listShowsCurrentFlyersBeforeUpcomingAndHidesExpired() {
        Clock thursday = Clock.fixed(Instant.parse("2026-09-10T08:00:00Z"), ZoneId.of("Europe/Budapest"));
        FlyerQueryService listing = new FlyerQueryService(flyerRepository, flyerSyncService, thursday);
        when(flyerSyncService.isStale(LocalDateTime.of(2026, 9, 10, 10, 0))).thenReturn(false);
        when(flyerRepository.findAllByOrderByStoreAscTitleAsc()).thenReturn(List.of(
                datedFlyer("ALDI 36. hét", LocalDate.of(2026, 9, 3), LocalDate.of(2026, 9, 9)),
                datedFlyer("ALDI 20. hét", LocalDate.of(2026, 5, 14), LocalDate.of(2026, 5, 20)),
                datedFlyer("ALDI 38. hét", LocalDate.of(2026, 9, 17), LocalDate.of(2026, 9, 23)),
                datedFlyer("ALDI 37. hét", LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 16))
        ));

        List<String> titles = listing.list(null).stream().map(FlyerSummaryDto::title).toList();

        assertEquals(List.of("ALDI 37. hét", "ALDI 38. hét"), titles);
    }

    @Test
    void listPutsAldiOnlineBeforeMiddleLaneAndSparBrandsInOrder() {
        Clock thursday = Clock.fixed(Instant.parse("2026-09-10T08:00:00Z"), ZoneId.of("Europe/Budapest"));
        FlyerQueryService listing = new FlyerQueryService(flyerRepository, flyerSyncService, thursday);
        when(flyerSyncService.isStale(LocalDateTime.of(2026, 9, 10, 10, 0))).thenReturn(false);
        Flyer middle = datedFlyer("ALDI Középső sor", LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 16));
        middle.setOfficialUrl("https://szorolap.aldi.hu/aldi_kozepso_sor_2026_kw37/");
        Flyer online = datedFlyer("ALDI Online akciós újság", LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 16));
        online.setOfficialUrl("https://szorolap.aldi.hu/aldi_online_akcios_ujsag_2026_kw37/");
        Flyer spar = datedFlyer("SPAR szórólap", LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 16));
        spar.setStore("spar");
        spar.setSourceKey("spar:spar:2026-09-10");
        spar.setOfficialUrl("https://www.spar.hu/ajanlatok/spar/260910-1-spar-szorolap");
        Flyer market = datedFlyer("SPAR Market", LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 16));
        market.setStore("spar");
        market.setSourceKey("spar:spar-market:2026-09-10");
        market.setOfficialUrl("https://www.spar.hu/ajanlatok/spar-market/260910-3-spar-market-city-spar");
        Flyer inter = datedFlyer("INTERSPAR szórólap", LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 16));
        inter.setStore("spar");
        inter.setSourceKey("spar:interspar:2026-09-10");
        inter.setOfficialUrl("https://www.spar.hu/ajanlatok/interspar/260910-2-interspar-szorolap");
        when(flyerRepository.findAllByOrderByStoreAscTitleAsc()).thenReturn(List.of(middle, online, market, inter, spar));

        List<String> titles = listing.list(null).stream().map(FlyerSummaryDto::title).toList();

        assertEquals(List.of(
                "ALDI Online akciós újság",
                "ALDI Középső sor",
                "SPAR szórólap",
                "INTERSPAR szórólap",
                "SPAR Market"
        ), titles);
    }

    @Test
    void searchSkipsExpiredFlyers() {
        Flyer expired = flyerWithProduct("Kakaóscsiga", "249 Ft");
        expired.setValidFrom(LocalDate.of(2026, 5, 14));
        expired.setValidTo(LocalDate.of(2026, 5, 20));
        when(flyerSyncService.isStale(LocalDateTime.of(2026, 9, 6, 12, 0))).thenReturn(false);
        when(flyerRepository.findAllByOrderByStoreAscTitleAsc()).thenReturn(List.of(expired));

        assertTrue(service.search("kakaoscsiga").isEmpty());
    }

    private static Flyer datedFlyer(String title, LocalDate from, LocalDate to) {
        Flyer flyer = new Flyer();
        flyer.setId((long) title.hashCode());
        flyer.setStore("aldi");
        flyer.setTitle(title);
        flyer.setValidFrom(from);
        flyer.setValidTo(to);
        return flyer;
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

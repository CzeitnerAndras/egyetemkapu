package com.egyetemkapu.service;

import com.egyetemkapu.dto.FlyerDetailDto;
import com.egyetemkapu.dto.FlyerSearchHitDto;
import com.egyetemkapu.dto.FlyerSummaryDto;
import com.egyetemkapu.model.Flyer;
import com.egyetemkapu.model.FlyerPage;
import com.egyetemkapu.model.FlyerProduct;
import com.egyetemkapu.repository.FlyerRepository;
import com.egyetemkapu.service.flyer.FlyerExtractorRegistry;
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
import java.util.Optional;

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
        service = new FlyerQueryService(
                flyerRepository, flyerSyncService, clock, new FlyerExtractorRegistry(new FlyerCatalogParser()));
    }

    @Test
    void searchFindsAccentInsensitiveProductAndRefreshesWhenStale() {
        Flyer flyer = flyerWithProduct("Kakaóscsiga");
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
        FlyerQueryService listing = new FlyerQueryService(
                flyerRepository, flyerSyncService, thursday, new FlyerExtractorRegistry(new FlyerCatalogParser()));
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
    void listHidesFlyersWithNoPages() {
        Clock thursday = Clock.fixed(Instant.parse("2026-09-10T08:00:00Z"), ZoneId.of("Europe/Budapest"));
        FlyerQueryService listing = new FlyerQueryService(
                flyerRepository, flyerSyncService, thursday, new FlyerExtractorRegistry(new FlyerCatalogParser()));
        when(flyerSyncService.isStale(LocalDateTime.of(2026, 9, 10, 10, 0))).thenReturn(false);
        Flyer empty = datedFlyer("ALDI KOZEPSO SOR 2026 KW38", LocalDate.of(2026, 9, 17), LocalDate.of(2026, 9, 23));
        empty.getPages().clear();
        Flyer online = datedFlyer("ALDI Online", LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 16));
        when(flyerRepository.findAllByOrderByStoreAscTitleAsc()).thenReturn(List.of(empty, online));

        List<String> titles = listing.list(null).stream().map(FlyerSummaryDto::title).toList();

        assertEquals(List.of("ALDI Online"), titles);
    }

    @Test
    void listPutsAldiOnlineBeforeMiddleLaneAndSparBrandsInOrder() {
        Clock thursday = Clock.fixed(Instant.parse("2026-09-10T08:00:00Z"), ZoneId.of("Europe/Budapest"));
        FlyerQueryService listing = new FlyerQueryService(
                flyerRepository, flyerSyncService, thursday, new FlyerExtractorRegistry(new FlyerCatalogParser()));
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
                "SPAR szórólap",
                "INTERSPAR szórólap",
                "SPAR Market",
                "ALDI Online akciós újság",
                "ALDI Középső sor"
        ), titles);
    }

    @Test
    void listPutsTescoHypermarketBeforeSupermarketAndCatalogue() {
        Clock thursday = Clock.fixed(Instant.parse("2026-09-10T08:00:00Z"), ZoneId.of("Europe/Budapest"));
        FlyerQueryService listing = new FlyerQueryService(
                flyerRepository, flyerSyncService, thursday, new FlyerExtractorRegistry(new FlyerCatalogParser()));
        when(flyerSyncService.isStale(LocalDateTime.of(2026, 9, 10, 10, 0))).thenReturn(false);
        Flyer catalogue = datedFlyer("Tesco Katalógus", LocalDate.of(2026, 8, 5), LocalDate.of(2026, 9, 13));
        catalogue.setStore("tesco");
        catalogue.setSourceKey("tesco:CAT:2026-08-05");
        catalogue.setOfficialUrl("https://www.tesco.hu/akciok/katalogusok/katalogus/tesco-ujsag-2026-08-05/1");
        Flyer supermarket = datedFlyer("Tesco Szupermarket", LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 16));
        supermarket.setStore("tesco");
        supermarket.setSourceKey("tesco:SM:2026-09-10");
        supermarket.setOfficialUrl("https://www.tesco.hu/akciok/katalogusok/szupermarket/tesco-ujsag-2026-09-10/1");
        Flyer hypermarket = datedFlyer("Tesco Hipermarket", LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 16));
        hypermarket.setStore("tesco");
        hypermarket.setSourceKey("tesco:HM:2026-09-10");
        hypermarket.setOfficialUrl("https://www.tesco.hu/akciok/katalogusok/hipermarket/tesco-ujsag-2026-09-10/1");
        when(flyerRepository.findAllByOrderByStoreAscTitleAsc())
                .thenReturn(List.of(catalogue, supermarket, hypermarket));

        List<String> titles = listing.list(null).stream().map(FlyerSummaryDto::title).toList();

        assertEquals(0, FlyerQueryService.paperKind(hypermarket));
        assertEquals(1, FlyerQueryService.paperKind(supermarket));
        assertEquals(2, FlyerQueryService.paperKind(catalogue));
        assertEquals(List.of("Tesco Hipermarket", "Tesco Szupermarket", "Tesco Katalógus"), titles);
    }

    @Test
    void searchSkipsExpiredFlyers() {
        Flyer expired = flyerWithProduct("Kakaóscsiga");
        expired.setValidFrom(LocalDate.of(2026, 5, 14));
        expired.setValidTo(LocalDate.of(2026, 5, 20));
        when(flyerSyncService.isStale(LocalDateTime.of(2026, 9, 6, 12, 0))).thenReturn(false);
        when(flyerRepository.findAllByOrderByStoreAscTitleAsc()).thenReturn(List.of(expired));

        assertTrue(service.search("kakaoscsiga").isEmpty());
    }

    @Test
    void getIncludesProductsForTheFlyer() {
        Flyer flyer = flyerWithProduct("Kakaóscsiga");
        when(flyerRepository.findById(3L)).thenReturn(Optional.of(flyer));

        FlyerDetailDto detail = service.get(3L);

        assertEquals(1, detail.products().size());
        assertEquals(11L, detail.products().getFirst().id());
        assertEquals("Kakaóscsiga", detail.products().getFirst().name());
        assertEquals(2, detail.products().getFirst().pageNumber());
    }

    @Test
    void getReplacesWeakUnitNamesFromStoredPageText() {
        Flyer flyer = flyerWithProduct("csomag");
        flyer.getProducts().getFirst().setPageNumber(1);
        FlyerPage page = new FlyerPage();
        page.setPageNumber(1);
        page.setPageText("""
                ÍNYENC GRILLKOLBÁSZ
                300 g/csomag
                2 330 Ft/kg

                699
                Ft
                """);
        flyer.addPage(page);
        when(flyerRepository.findById(3L)).thenReturn(Optional.of(flyer));
        when(flyerRepository.save(flyer)).thenReturn(flyer);

        FlyerDetailDto detail = service.get(3L);

        assertTrue(detail.products().stream().anyMatch(product ->
                product.name().toUpperCase().contains("GRILLKOLBÁSZ")));
        assertTrue(detail.products().stream().noneMatch(product -> "csomag".equalsIgnoreCase(product.name())));
        verify(flyerSyncService).refreshStoredLayout(flyer);
    }

    @Test
    void getReplacesMismatchedStrongProductsFromStoredPageText() {
        Flyer flyer = flyerWithProduct("Őszibarack");
        flyer.getProducts().getFirst().setPageNumber(1);
        FlyerPage page = new FlyerPage();
        page.setPageNumber(1);
        page.setPageText("""
                ÍNYENC GRILLKOLBÁSZ
                300 g/csomag

                699
                Ft
                """);
        flyer.addPage(page);
        when(flyerRepository.findById(3L)).thenReturn(Optional.of(flyer));
        when(flyerRepository.save(flyer)).thenReturn(flyer);

        FlyerDetailDto detail = service.get(3L);

        assertTrue(detail.products().stream().anyMatch(product ->
                product.name().toUpperCase().contains("GRILLKOLBÁSZ")));
        assertTrue(detail.products().stream().noneMatch(product -> "Őszibarack".equalsIgnoreCase(product.name())));
    }

    private static Flyer datedFlyer(String title, LocalDate from, LocalDate to) {
        Flyer flyer = new Flyer();
        flyer.setId((long) title.hashCode());
        flyer.setStore("aldi");
        flyer.setTitle(title);
        flyer.setValidFrom(from);
        flyer.setValidTo(to);
        FlyerPage page = new FlyerPage();
        page.setPageNumber(1);
        flyer.addPage(page);
        return flyer;
    }

    private static Flyer flyerWithProduct(String name) {
        Flyer flyer = new Flyer();
        flyer.setId(3L);
        flyer.setStore("aldi");
        flyer.setTitle("ALDI heti újság");
        FlyerPage page = new FlyerPage();
        page.setPageNumber(2);
        flyer.addPage(page);
        FlyerProduct product = new FlyerProduct();
        product.setId(11L);
        product.setName(name);
        product.setPageNumber(2);
        flyer.addProduct(product);
        return flyer;
    }
}

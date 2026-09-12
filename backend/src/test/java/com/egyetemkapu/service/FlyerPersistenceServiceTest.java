package com.egyetemkapu.service;

import com.egyetemkapu.model.Flyer;
import com.egyetemkapu.repository.FlyerRepository;
import com.egyetemkapu.service.FlyerCatalogParser.DiscoveredPaper;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedCatalog;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedPage;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FlyerPersistenceServiceTest {

    @Mock private FlyerRepository flyerRepository;
    @InjectMocks private FlyerPersistenceService service;

    @Test
    void updatesExistingFlyerInPlaceAndDeletesOnlyObsoleteOnes() {
        Flyer keep = new Flyer();
        keep.setId(42L);
        keep.setStore("aldi");
        keep.setSourceKey("aldi:online");
        Flyer drop = new Flyer();
        drop.setId(7L);
        drop.setStore("aldi");
        drop.setSourceKey("aldi:old");
        when(flyerRepository.findByStoreOrderByValidFromDescTitleAsc("aldi")).thenReturn(List.of(keep, drop));

        LocalDate today = LocalDate.of(2026, 9, 10);
        ParsedCatalog catalog = new ParsedCatalog(
                new DiscoveredPaper("aldi", "ALDI Online", "https://szorolap.aldi.hu/x/", null,
                        "aldi:online", today, today.plusDays(6)),
                List.of(new ParsedPage(1, "https://szorolap.aldi.hu/page.jpg", "alma")),
                List.of(new ParsedProduct("Alma", 1, null))
        );

        service.replaceStore("aldi", List.of(catalog), LocalDateTime.of(2026, 9, 10, 10, 0));

        verify(flyerRepository, never()).deleteByStore("aldi");
        ArgumentCaptor<Flyer> saved = ArgumentCaptor.forClass(Flyer.class);
        verify(flyerRepository, atLeastOnce()).save(saved.capture());
        Flyer persisted = saved.getValue();
        assertSame(keep, persisted);
        assertEquals(42L, persisted.getId());
        assertEquals("ALDI Online", persisted.getTitle());
        assertEquals(1, persisted.getPages().size());
        verify(flyerRepository).saveAndFlush(keep);
        verify(flyerRepository).delete(drop);
    }

    @Test
    void skipsEmptyCatalogsSoAFailedSyncCannotWipeTheStore() {
        service.replaceStore("aldi", List.of(), LocalDateTime.of(2026, 9, 10, 10, 0));

        verify(flyerRepository, never()).findByStoreOrderByValidFromDescTitleAsc("aldi");
        verify(flyerRepository, never()).deleteByStore("aldi");
        verify(flyerRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }
}

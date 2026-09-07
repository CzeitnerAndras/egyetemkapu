package com.egyetemkapu.service;

import com.egyetemkapu.repository.FlyerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FlyerSyncServiceTest {

    @Mock private FlyerRepository flyerRepository;
    @Mock private FlyerPersistenceService flyerPersistenceService;
    @Mock private FlyerHttpClient httpClient;
    @Mock private FlyerPdfExtractor pdfExtractor;

    private FlyerCatalogParser parser;
    private FlyerSyncService service;

    @BeforeEach
    void setUp() {
        parser = new FlyerCatalogParser();
        Clock clock = Clock.fixed(Instant.parse("2026-09-06T08:00:00Z"), ZoneId.of("Europe/Budapest"));
        service = new FlyerSyncService(flyerRepository, flyerPersistenceService, httpClient, parser, pdfExtractor, clock);
    }

    @Test
    void syncAldiPersistsPublitasCatalog() {
        when(httpClient.getText("https://www.aldi.hu/online-akcios-ujsag"))
                .thenReturn("<a href=\"https://szorolap.aldi.hu/aldi_online_akcios_ujsag_2026_kw36/\">x</a>");
        when(httpClient.getText("https://szorolap.aldi.hu/aldi_online_akcios_ujsag_2026_kw36/data.json"))
                .thenReturn("{\"config\":{\"publicationTitle\":\"ALDI KW36\"}}");
        when(httpClient.getText("https://szorolap.aldi.hu/aldi_online_akcios_ujsag_2026_kw36/spreads.json"))
                .thenReturn("{\"spreads\":[{\"pages\":[{\"number\":1,\"products\":[{\"title\":\"Kakaóscsiga\",\"price\":\"249\"}]}]}]}");

        service.syncAldi(LocalDate.of(2026, 9, 6));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<FlyerCatalogParser.ParsedCatalog>> captor = ArgumentCaptor.forClass(List.class);
        verify(flyerPersistenceService).replaceStore(eq("aldi"), captor.capture(), any());
        assertEquals("ALDI KW36", captor.getValue().getFirst().paper().title());
        assertEquals("Kakaóscsiga", captor.getValue().getFirst().products().getFirst().name());
    }
}

package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class FlyerExtractorRegistry {

    private final Map<String, FlyerProductExtractor> byStore;
    private final FlyerProductExtractor generic;

    public FlyerExtractorRegistry(FlyerCatalogParser parser) {
        this.generic = new GenericFlyerExtractor(parser);
        this.byStore = Map.of(
                "aldi", new AldiFlyerExtractor(parser),
                "spar", new SparFlyerExtractor(parser),
                "penny", new PennyFlyerExtractor(parser),
                "tesco", new TescoFlyerExtractor(parser)
        );
    }

    public FlyerProductExtractor forStore(String store) {
        if (store == null || store.isBlank()) {
            return generic;
        }
        return byStore.getOrDefault(store.toLowerCase(), generic);
    }
}

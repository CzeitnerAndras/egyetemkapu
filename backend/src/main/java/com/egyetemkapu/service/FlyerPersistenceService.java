package com.egyetemkapu.service;

import com.egyetemkapu.model.Flyer;
import com.egyetemkapu.model.FlyerPage;
import com.egyetemkapu.model.FlyerProduct;
import com.egyetemkapu.repository.FlyerRepository;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedCatalog;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedPage;
import com.egyetemkapu.service.FlyerCatalogParser.ParsedProduct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Service
public class FlyerPersistenceService {

    private final FlyerRepository flyerRepository;

    public FlyerPersistenceService(FlyerRepository flyerRepository) {
        this.flyerRepository = flyerRepository;
    }

    @Transactional
    public void replaceStore(String store, java.util.List<ParsedCatalog> catalogs, LocalDateTime synced) {
        flyerRepository.deleteByStore(store);
        flyerRepository.flush();
        Set<String> savedKeys = new HashSet<>();
        for (ParsedCatalog catalog : catalogs) {
            String sourceKey = limit(catalog.paper().sourceKey(), 255);
            if (sourceKey != null && !savedKeys.add(sourceKey)) {
                continue;
            }
            Flyer flyer = new Flyer();
            flyer.setStore(catalog.paper().store());
            flyer.setTitle(limit(catalog.paper().title(), 255));
            flyer.setOfficialUrl(limit(catalog.paper().officialUrl(), 1000));
            flyer.setPdfUrl(limit(catalog.paper().pdfUrl(), 1000));
            flyer.setSourceKey(sourceKey);
            flyer.setValidFrom(catalog.paper().validFrom());
            flyer.setValidTo(catalog.paper().validTo());
            flyer.setLastSynced(synced);
            for (ParsedPage page : catalog.pages()) {
                FlyerPage entity = new FlyerPage();
                entity.setPageNumber(page.pageNumber());
                entity.setImageUrl(limit(page.imageUrl(), 2000));
                entity.setPageText(page.text());
                flyer.addPage(entity);
            }
            for (ParsedProduct product : catalog.products()) {
                FlyerProduct entity = new FlyerProduct();
                entity.setPageNumber(product.pageNumber());
                entity.setName(limit(product.name(), 500));
                entity.setImageUrl(limit(product.imageUrl(), 2000));
                flyer.addProduct(entity);
            }
            flyerRepository.save(flyer);
        }
    }

    private static String limit(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}

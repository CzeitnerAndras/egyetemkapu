package com.egyetemkapu.service;

import com.egyetemkapu.dto.FlyerSearchHitDto;
import com.egyetemkapu.model.Flyer;
import com.egyetemkapu.model.FlyerPage;
import com.egyetemkapu.model.FlyerProduct;
import com.egyetemkapu.repository.FlyerProductRepository;
import com.egyetemkapu.repository.FlyerProductRepository.SearchRow;
import com.egyetemkapu.repository.FlyerRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = "spring.task.scheduling.enabled=false")
@Transactional
class FlyerProductSearchTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 29);

    @Autowired private FlyerRepository flyerRepository;
    @Autowired private FlyerProductRepository flyerProductRepository;
    @Autowired private EntityManager entityManager;

    // --- Index ---
    @Test
    void indexFindsAPrefixAndATypoAndLeavesABrandAndAnExpiredFlyerOut() {
        save("current", TODAY.minusDays(1), TODAY.plusDays(5), true,
                "qqzzkakaoscsiga", "qqzzalma", "qqzzalmare seafood", "qqzzjonagold");
        save("expired", TODAY.minusDays(20), TODAY.minusDays(10), true, "qqzzkakaoscsiga");
        save("upcoming", TODAY.plusDays(20), TODAY.plusDays(26), true, "qqzzalma");
        save("blank", TODAY.minusDays(1), TODAY.plusDays(5), false, "qqzzkakaoscsiga");
        entityManager.flush();
        entityManager.clear();

        assertEquals(List.of("qqzzkakaoscsiga"), ranked("qqzzkaka"));
        assertEquals(List.of("qqzzalma"), ranked("qqzzalma"));
        assertEquals(List.of("qqzzjonagold"), ranked("qqzzjonagld"));
        assertTrue(candidates("qqzzjonagld").stream().anyMatch(row -> "qqzzjonagold".equals(row.getName())));
    }

    // --- Query ---
    private List<String> ranked(String query) {
        return FlyerSearchRank.rank(toCandidates(candidates(query).stream()
                        .filter(row -> row.getName() != null && row.getName().startsWith("qqzz"))
                        .toList()), query).stream()
                .map(FlyerSearchHitDto::productName)
                .toList();
    }

    private List<SearchRow> candidates(String query) {
        String folded = HungarianText.normalize(query);
        return flyerProductRepository.searchCandidates(
                folded, FlyerSearchRank.likePattern(folded), TODAY, TODAY.plusDays(8));
    }

    private static List<FlyerSearchCandidate> toCandidates(List<SearchRow> rows) {
        return rows.stream()
                .map(row -> new FlyerSearchCandidate(
                        row.getProductId(),
                        row.getFlyerId(),
                        row.getStore(),
                        row.getTitle(),
                        row.getPageNumber(),
                        row.getName()))
                .toList();
    }

    // --- Rows ---
    private void save(String key, LocalDate from, LocalDate to, boolean withPage, String... names) {
        Flyer flyer = new Flyer();
        flyer.setStore("aldi");
        flyer.setTitle("test " + key);
        flyer.setOfficialUrl("https://example.test/" + key);
        flyer.setSourceKey("test-search:" + key);
        flyer.setValidFrom(from);
        flyer.setValidTo(to);
        flyer.setLastSynced(LocalDateTime.of(2026, 10, 29, 6, 30));
        if (withPage) {
            FlyerPage page = new FlyerPage();
            page.setPageNumber(1);
            flyer.addPage(page);
        }
        for (String name : names) {
            FlyerProduct product = new FlyerProduct();
            product.setPageNumber(1);
            product.setName(name);
            flyer.addProduct(product);
        }
        flyerRepository.save(flyer);
    }
}

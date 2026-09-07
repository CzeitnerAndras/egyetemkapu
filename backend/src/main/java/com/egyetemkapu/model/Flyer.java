package com.egyetemkapu.model;

import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "flyers")
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Flyer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(nullable = false, length = 32)
    private String store;

    @Column(nullable = false)
    private String title;

    @Column(name = "official_url", nullable = false, length = 1000)
    private String officialUrl;

    @Column(name = "pdf_url", length = 1000)
    private String pdfUrl;

    @Column(name = "source_key", nullable = false, unique = true)
    private String sourceKey;

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    @Column(name = "last_synced", nullable = false)
    private LocalDateTime lastSynced;

    @OneToMany(mappedBy = "flyer", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("pageNumber ASC")
    private List<FlyerPage> pages = new ArrayList<>();

    @OneToMany(mappedBy = "flyer", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FlyerProduct> products = new ArrayList<>();

    public void addPage(FlyerPage page) {
        page.setFlyer(this);
        pages.add(page);
    }

    public void addProduct(FlyerProduct product) {
        product.setFlyer(this);
        products.add(product);
    }
}

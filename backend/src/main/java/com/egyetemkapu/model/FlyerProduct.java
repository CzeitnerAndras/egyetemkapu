package com.egyetemkapu.model;

import com.egyetemkapu.service.HungarianText;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "flyer_products")
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class FlyerProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "flyer_id", nullable = false)
    private Flyer flyer;

    @Column(name = "page_number", nullable = false)
    private int pageNumber;

    @Setter(AccessLevel.NONE)
    @Column(nullable = false, length = 500)
    private String name;

    @Setter(AccessLevel.NONE)
    @Column(name = "name_folded", nullable = false, length = 500)
    private String nameFolded;

    @Column(name = "image_url", length = 2000)
    private String imageUrl;

    // --- Folded name ---
    public void setName(String name) {
        this.name = name;
        foldName();
    }

    @PrePersist
    @PreUpdate
    public void foldName() {
        String folded = HungarianText.normalize(name);
        this.nameFolded = folded.length() <= 500 ? folded : folded.substring(0, 500);
    }
}

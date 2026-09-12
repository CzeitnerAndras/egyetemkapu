package com.egyetemkapu.model;

import jakarta.persistence.*;
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

    @Column(nullable = false, length = 500)
    private String name;

    @Column(name = "image_url", length = 2000)
    private String imageUrl;
}

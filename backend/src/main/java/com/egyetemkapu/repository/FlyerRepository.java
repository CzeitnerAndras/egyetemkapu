package com.egyetemkapu.repository;

import com.egyetemkapu.model.Flyer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FlyerRepository extends JpaRepository<Flyer, Long> {
    List<Flyer> findByStoreOrderByValidFromDescTitleAsc(String store);

    List<Flyer> findAllByOrderByStoreAscTitleAsc();

    Optional<Flyer> findBySourceKey(String sourceKey);

    void deleteByStore(String store);
}

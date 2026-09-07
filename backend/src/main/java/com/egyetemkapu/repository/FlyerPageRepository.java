package com.egyetemkapu.repository;

import com.egyetemkapu.model.FlyerPage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FlyerPageRepository extends JpaRepository<FlyerPage, Long> {
    Optional<FlyerPage> findByFlyerIdAndPageNumber(Long flyerId, int pageNumber);
}

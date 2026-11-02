package com.groceryshop.barcode;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BarcodeCatalogRepository extends JpaRepository<BarcodeCatalog, Long> {

    Optional<BarcodeCatalog> findByCodeIgnoreCase(String code);
}
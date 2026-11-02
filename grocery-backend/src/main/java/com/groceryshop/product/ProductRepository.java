package com.groceryshop.product;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByCategoryId(Long categoryId);

    /** Products currently mapped to a supplier. */
    List<Product> findBySupplierIdOrderByNameAsc(Long supplierId);

    @Query("SELECT p FROM Product p WHERE p.name LIKE %:query% OR p.description LIKE %:query%")
    List<Product> search(@Param("query") String query);

    @Query("SELECT p FROM Product p WHERE p.stock <= p.minStock")
    List<Product> findLowStock();

    @Query("SELECT COALESCE(MAX(p.id), 0) FROM Product p")
    Long findMaxId();

    /** Internal short till code lookup. */
    Optional<Product> findByCode(String code);

    /** Printed barcode lookup (scanner gun/mobile). */
    Optional<Product> findByBarcode(String barcode);

    long countByCategoryId(Long categoryId);

    /** Products with no barcode, in id order after a cursor — used by the auto-match tool. */
    @Query("SELECT p FROM Product p WHERE (p.barcode IS NULL OR TRIM(p.barcode) = '') AND p.id > :afterId ORDER BY p.id ASC")
    List<Product> findUncodedAfter(@Param("afterId") Long afterId, Pageable pageable);

    @Query("SELECT COUNT(p) FROM Product p WHERE (p.barcode IS NULL OR TRIM(p.barcode) = '') AND p.id > :afterId")
    long countUncodedAfter(@Param("afterId") Long afterId);

    @Override
    Optional<Product> findById(Long id);
}

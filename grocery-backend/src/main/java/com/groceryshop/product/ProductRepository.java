package com.groceryshop.product;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByCategoryId(Long categoryId);

    @Query("SELECT p FROM Product p WHERE p.name LIKE %:query% OR p.description LIKE %:query%")
    List<Product> search(@Param("query") String query);

    @Query("SELECT p FROM Product p WHERE p.stock <= p.minStock")
    List<Product> findLowStock();

    @Query("SELECT COALESCE(MAX(p.id), 0) FROM Product p")
    Long findMaxId();

    @Override
    Optional<Product> findById(Long id);
}
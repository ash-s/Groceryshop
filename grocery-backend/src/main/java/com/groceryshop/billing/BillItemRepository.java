package com.groceryshop.billing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BillItemRepository extends JpaRepository<BillItem, Long> {

    /** Total quantity sold per product from staff POS bills. */
    @Query("SELECT bi.product.id, COALESCE(SUM(bi.quantity), 0) FROM BillItem bi GROUP BY bi.product.id")
    List<Object[]> sumSoldByProduct();

    /** Total quantity sold for one product from staff POS bills. */
    @Query("SELECT COALESCE(SUM(bi.quantity), 0) FROM BillItem bi WHERE bi.product.id = :productId")
    long sumSoldByProductId(@Param("productId") Long productId);
}
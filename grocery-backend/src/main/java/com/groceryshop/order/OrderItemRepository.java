package com.groceryshop.order;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    /** Total quantity sold per product from customer orders (cancelled orders excluded). */
    @Query("SELECT oi.product.id, COALESCE(SUM(oi.quantity), 0) FROM OrderItem oi " +
            "WHERE oi.order.status <> com.groceryshop.order.OrderStatus.CANCELLED GROUP BY oi.product.id")
    List<Object[]> sumSoldByProduct();

    /** Total quantity sold for one product from customer orders (cancelled excluded). */
    @Query("SELECT COALESCE(SUM(oi.quantity), 0) FROM OrderItem oi " +
            "WHERE oi.product.id = :productId AND oi.order.status <> com.groceryshop.order.OrderStatus.CANCELLED")
    long sumSoldByProductId(@Param("productId") Long productId);
}
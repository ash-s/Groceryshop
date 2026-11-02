package com.groceryshop.restock;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface RestockEventRepository extends JpaRepository<RestockEvent, Long> {

    List<RestockEvent> findAllByOrderByCreatedAtDesc();

    /** Pending (not yet delivered) purchases, soonest expected delivery first. */
    List<RestockEvent> findByStatusOrderByExpectedDeliveryAsc(String status);

    /** Pending purchases whose expected delivery has already arrived (due or overdue). */
    List<RestockEvent> findByStatusAndExpectedDeliveryLessThanEqual(String status, LocalDate expectedDelivery);

    /** Purchases recorded against a supplier, newest first. */
    List<RestockEvent> findBySupplierIdOrderByCreatedAtDesc(Long supplierId);
}
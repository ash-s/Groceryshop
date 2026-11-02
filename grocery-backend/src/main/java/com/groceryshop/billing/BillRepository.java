package com.groceryshop.billing;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface BillRepository extends JpaRepository<Bill, Long> {

    List<Bill> findAllByOrderByCreatedAtDesc();

    List<Bill> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    boolean existsByCustomerId(Long customerId);

    boolean existsByStaffId(Long staffId);
}
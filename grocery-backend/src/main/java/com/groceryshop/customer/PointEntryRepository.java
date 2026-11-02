package com.groceryshop.customer;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PointEntryRepository extends JpaRepository<PointEntry, Long> {

    List<PointEntry> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
}

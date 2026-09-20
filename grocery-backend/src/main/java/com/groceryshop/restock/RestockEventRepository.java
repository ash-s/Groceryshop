package com.groceryshop.restock;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RestockEventRepository extends JpaRepository<RestockEvent, Long> {

    List<RestockEvent> findAllByOrderByCreatedAtDesc();
}
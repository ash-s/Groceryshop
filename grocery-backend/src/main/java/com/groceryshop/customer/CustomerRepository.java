package com.groceryshop.customer;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    List<Customer> findAllByOrderByNameAsc();

    List<Customer> findByNameContainingIgnoreCaseOrPhoneContainingOrderByNameAsc(String name, String phone);

    Optional<Customer> findFirstByPhone(String phone);
}

package com.groceryshop.staff;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SalaryPaymentRepository extends JpaRepository<SalaryPayment, Long> {

    Optional<SalaryPayment> findByUserIdAndSalaryMonth(Long userId, String salaryMonth);

    List<SalaryPayment> findBySalaryMonth(String salaryMonth);

    List<SalaryPayment> findByUserIdOrderBySalaryMonthDesc(Long userId);
}

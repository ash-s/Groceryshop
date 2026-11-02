package com.groceryshop.cash;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CashCountRepository extends JpaRepository<CashCount, Long> {

    Optional<CashCount> findByCountDate(LocalDate countDate);

    List<CashCount> findTop30ByOrderByCountDateDesc();
}

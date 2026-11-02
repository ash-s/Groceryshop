package com.groceryshop.cash;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * End-of-day physical cash count: how many notes/coins of each denomination are
 * in the till. One row per day. Rupee denominations counted are
 * ₹500, 200, 100, 50, 20, 10, 5, 2 and 1.
 */
@Entity
@Table(name = "cash_counts")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CashCount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "count_date", nullable = false, unique = true)
    private LocalDate countDate;

    @Column(nullable = false)
    @Builder.Default
    private Integer n500 = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer n200 = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer n100 = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer n50 = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer n20 = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer n10 = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer n5 = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer n2 = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer n1 = 0;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}

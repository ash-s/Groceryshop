package com.groceryshop.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * End-of-day cash reconciliation for one day: the physical count, the cash the
 * till should hold (cash paid by customers that day) and the difference.
 */
@Data
@Builder
public class CashCountDto {

    private Long id;
    private LocalDate date;

    private int n500;
    private int n200;
    private int n100;
    private int n50;
    private int n20;
    private int n10;
    private int n5;
    private int n2;
    private int n1;

    /** Total value of the physical count. */
    private BigDecimal total;
    /** Expected cash from bills paid in cash that day. */
    private BigDecimal expected;
    /** total - expected (positive = extra cash in the till). */
    private BigDecimal difference;
    /** Breakdown, newest first, of the denominations counted. */
    private List<Denomination> denominations;

    @Data
    @Builder
    public static class Denomination {
        private int value;
        private int count;
        private BigDecimal amount;
    }
}

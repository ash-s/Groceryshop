package com.groceryshop.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class DailySalesDto {

    private String date;    // ISO date, e.g. 2026-09-20
    private String label;   // weekday ("Mon") for weekly, day-of-month for monthly
    private BigDecimal total;
    private long billCount;
    /** Profit for this day = (selling - buying), net of discounts. */
    private BigDecimal profit;
}

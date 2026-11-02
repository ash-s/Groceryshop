package com.groceryshop.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class SalesReportDto {

    private List<DailySalesDto> daily;
    private BigDecimal totalSales;
    private long billCount;
    private long itemsSold;
    /** Profit = (selling - buying) over the period, net of bill discounts. */
    private BigDecimal totalProfit;
}

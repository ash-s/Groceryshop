package com.groceryshop.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class BillDto {

    private Long id;
    private String billNumber;
    private String staffName;
    private String customerName;
    private BigDecimal total;
    private String paymentMethod;
    private LocalDateTime createdAt;
    private List<BillItemDto> items;
}
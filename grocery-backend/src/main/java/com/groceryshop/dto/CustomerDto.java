package com.groceryshop.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class CustomerDto {

    private Long id;
    private String name;
    private String phone;
    private Integer points;
    /** Rupee value of the current point balance at the configured rate. */
    private BigDecimal pointsValue;
    private String notes;
}

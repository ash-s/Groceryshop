package com.groceryshop.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class RestockEventDto {

    private Long id;
    private Long productId;
    private String productName;
    private String productCode;
    private Integer quantity;

    /** AUTO (sale-time top-up) or MANUAL (admin restock / received delivery). */
    private String eventType;

    /** SUPPLIER / COURIER / SELF_PICKUP / OTHER — for manual restocks. */
    private String deliveryMethod;

    private LocalDateTime receivedAt;
    private BigDecimal costPerUnit;
    private String notes;
    private String createdBy;
    private LocalDateTime createdAt;
}
package com.groceryshop.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Body of a manual restock: quantity is required, delivery details are optional. */
@Data
public class RestockRequest {

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    /** SUPPLIER / COURIER / SELF_PICKUP / OTHER */
    private String deliveryMethod;

    private BigDecimal costPerUnit;

    /** When the goods were received; defaults to now when omitted. */
    private LocalDateTime receivedAt;

    /** When the delivery is EXPECTED to arrive. When set, stock is NOT added yet —
     *  a pending delivery is recorded and the stock only increases once the admin
     *  confirms the delivery as received. Leave blank to top up stock immediately. */
    private LocalDate expectedDelivery;

    private String notes;

    /** Which supplier this purchase is from (optional; falls back to the product's supplier). */
    private Long supplierId;
}
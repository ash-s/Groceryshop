package com.groceryshop.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OrderRequest {

    @NotBlank(message = "Delivery address is required")
    private String deliveryAddress;

    private String paymentMethod = "CASH_ON_DELIVERY";
}
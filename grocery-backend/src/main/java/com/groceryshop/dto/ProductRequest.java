package com.groceryshop.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductRequest {

    @NotBlank(message = "Product name is required")
    private String name;

    /** Barcode / product code used for fast checkout (optional). */
    private String code;

    private String description;

    /** Brand/make of the product, e.g. Amul, Britannia (optional). */
    private String brand;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.01", message = "Price must be greater than zero")
    private BigDecimal price;

    private Integer stock;
    private Integer minStock;
    private String imageUrl;
    private Long categoryId;
    private Long supplierId;
}
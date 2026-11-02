package com.groceryshop.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ProductRequest {

    @NotBlank(message = "Product name is required")
    private String name;

    /** Internal short till code, e.g. "0001" (optional). */
    private String code;

    /** Printed barcode on the packet, matched by the scanner (optional). */
    private String barcode;

    private String description;

    /** Brand/make of the product, e.g. Amul, Britannia (optional). */
    private String brand;

    /** Rack / shelf location label, e.g. "A2" (optional). */
    private String rack;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.01", message = "Price must be greater than zero")
    private BigDecimal price;

    /** Buying (cost) price per unit (optional). */
    private BigDecimal costPrice;

    /** Expiry date of the current stock (optional). */
    private LocalDate expiryDate;

    private Integer stock;
    private Integer minStock;
    private String imageUrl;
    private Long categoryId;
    private Long supplierId;
    private String shop;
}

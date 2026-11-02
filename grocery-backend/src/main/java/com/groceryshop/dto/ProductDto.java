package com.groceryshop.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class ProductDto {

    private Long id;
    private String name;
    /** Internal short till code, e.g. "0001". */
    private String code;
    /** Printed barcode, matched by the scanner. */
    private String barcode;
    private String description;
    private String brand;
    private String rack;
    private BigDecimal price;
    /** Buying (cost) price per unit. */
    private BigDecimal costPrice;
    /** Expiry date of the current stock. */
    private LocalDate expiryDate;
    private Integer stock;
    private Integer minStock;
    private String imageUrl;
    private Long categoryId;
    private String categoryName;
    private Long supplierId;
    private String supplierName;
    private String shop;
    private boolean lowStock;

    /** Total units of this product sold so far (POS bills + orders, cancelled excluded). */
    private Long soldCount;

    /** Quantity from the most recent restock (manual or auto), if it happened recently. */
    private Integer restockQty;

    /** True when the recent restock was automatic (sale-time top-up), false for manual. */
    private Boolean restockAuto;

    /** When the recent restock happened. */
    private LocalDateTime restockAt;
}

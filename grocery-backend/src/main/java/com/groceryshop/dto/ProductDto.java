package com.groceryshop.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class ProductDto {

    private Long id;
    private String name;
    private String code;
    private String description;
    private BigDecimal price;
    private Integer stock;
    private Integer minStock;
    private String imageUrl;
    private Long categoryId;
    private String categoryName;
    private Long supplierId;
    private String supplierName;
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
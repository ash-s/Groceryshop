package com.groceryshop.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class ProductDto {

    private Long id;
    private String name;
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
}
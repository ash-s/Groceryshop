package com.groceryshop.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CategoryDto {

    private Long id;
    private String name;
    private String description;
    private String imageUrl;

    /** Number of products mapped to this category. */
    private Long productCount;
}
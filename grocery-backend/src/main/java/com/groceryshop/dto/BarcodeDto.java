package com.groceryshop.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BarcodeDto {

    private Long id;
    private String code;
    private String name;
    private String brand;
    private String category;
}
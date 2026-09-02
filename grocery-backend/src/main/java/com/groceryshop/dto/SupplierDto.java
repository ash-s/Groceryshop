package com.groceryshop.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SupplierDto {

    private Long id;
    private String name;
    private String company;
    private String phone;
    private String email;
    private String address;
}
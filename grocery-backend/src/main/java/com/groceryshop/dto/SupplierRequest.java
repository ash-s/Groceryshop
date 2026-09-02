package com.groceryshop.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SupplierRequest {

    @NotBlank(message = "Supplier name is required")
    private String name;

    private String company;

    @NotBlank(message = "Supplier phone is required")
    private String phone;

    private String email;
    private String address;
}
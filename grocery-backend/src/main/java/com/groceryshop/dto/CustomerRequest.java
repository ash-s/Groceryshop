package com.groceryshop.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CustomerRequest {

    @NotBlank(message = "Customer name is required")
    @Size(max = 120, message = "Name is too long")
    private String name;

    @Size(max = 20, message = "Phone is too long")
    private String phone;

    @Size(max = 500, message = "Notes are too long")
    private String notes;
}

package com.groceryshop.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminResetPasswordRequest {

    @Size(min = 6, message = "New password must be at least 6 characters")
    private String newPassword;
}
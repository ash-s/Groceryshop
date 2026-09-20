package com.groceryshop.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminResetPasswordResponse {

    private String message;

    /** Present only when a temporary password was auto-generated. */
    private String temporaryPassword;
}
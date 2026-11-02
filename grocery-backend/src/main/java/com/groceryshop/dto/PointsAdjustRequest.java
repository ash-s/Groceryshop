package com.groceryshop.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** Manual loyalty point adjustment made by the admin. */
@Data
public class PointsAdjustRequest {

    /** Points to add (positive) or remove (negative). */
    @NotNull(message = "Points change is required")
    private Integer points;

    private String reason;
}

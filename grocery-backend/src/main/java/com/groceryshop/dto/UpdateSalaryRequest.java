package com.groceryshop.dto;

import jakarta.validation.constraints.DecimalMin;
import lombok.Data;

import java.math.BigDecimal;

/** Monthly salary set by an admin for a staff member. */
@Data
public class UpdateSalaryRequest {

    @DecimalMin(value = "0.0", message = "Salary cannot be negative")
    private BigDecimal monthlySalary;
}

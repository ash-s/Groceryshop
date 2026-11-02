package com.groceryshop.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.math.BigDecimal;

/** Records a salary payment for one staff member and month. */
@Data
public class SalaryPayRequest {

    @NotNull(message = "Staff member is required")
    private Long userId;

    @NotNull(message = "Month is required")
    @Pattern(regexp = "\\d{4}-\\d{2}", message = "Month must be YYYY-MM")
    private String month;

    @DecimalMin(value = "0.0", message = "Bonus cannot be negative")
    private BigDecimal bonus;

    /** When omitted, the amount computed from attendance is used. */
    @DecimalMin(value = "0.0", message = "Deductions cannot be negative")
    private BigDecimal deductions;

    /** When omitted, the net payable amount is recorded as paid. */
    @DecimalMin(value = "0.0", message = "Paid amount cannot be negative")
    private BigDecimal paidAmount;

    private String notes;
}

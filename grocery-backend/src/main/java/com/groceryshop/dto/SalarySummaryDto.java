package com.groceryshop.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Computed salary for one staff member in one month, plus payment status. */
@Data
@Builder
public class SalarySummaryDto {

    private Long userId;
    private String userName;
    private String role;
    /** YYYY-MM */
    private String month;
    private BigDecimal monthlySalary;
    private int workingDays;
    private BigDecimal presentDays;
    private BigDecimal halfDays;
    private BigDecimal leaveDays;
    private BigDecimal absentDays;
    /** Deduction calculated from the attendance of this month. */
    private BigDecimal computedDeductions;
    /** Deduction actually applied (stored value when already paid). */
    private BigDecimal deductions;
    private BigDecimal bonus;
    private BigDecimal netPayable;
    private boolean paid;
    private BigDecimal paidAmount;
    private LocalDate paidOn;
    private String notes;
}

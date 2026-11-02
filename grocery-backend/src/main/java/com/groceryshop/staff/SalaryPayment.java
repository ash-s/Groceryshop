package com.groceryshop.staff;

import com.groceryshop.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** A salary paid to one staff member for one month (YYYY-MM). */
@Entity
@Table(name = "salary_payments",
        uniqueConstraints = @UniqueConstraint(name = "uk_salary_user_month",
                columnNames = {"user_id", "salary_month"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalaryPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Salary month in YYYY-MM form. */
    @Column(name = "salary_month", nullable = false, length = 7)
    private String salaryMonth;

    @Column(name = "base_salary", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseSalary;

    @Column(name = "working_days", nullable = false)
    private Integer workingDays;

    @Column(name = "present_days", nullable = false, precision = 5, scale = 1)
    private BigDecimal presentDays;

    @Column(name = "half_days", nullable = false, precision = 5, scale = 1)
    private BigDecimal halfDays;

    @Column(name = "leave_days", nullable = false, precision = 5, scale = 1)
    private BigDecimal leaveDays;

    @Column(name = "absent_days", nullable = false, precision = 5, scale = 1)
    private BigDecimal absentDays;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal deductions;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal bonus;

    @Column(name = "net_payable", nullable = false, precision = 10, scale = 2)
    private BigDecimal netPayable;

    @Column(name = "paid_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal paidAmount;

    @Column(name = "paid_on")
    private LocalDate paidOn;

    @Column(length = 255)
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}

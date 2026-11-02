package com.groceryshop.staff;

import com.groceryshop.dto.AttendanceMarkRequest;
import com.groceryshop.dto.AttendanceRowDto;
import com.groceryshop.dto.SalaryPayRequest;
import com.groceryshop.dto.SalarySummaryDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/staff")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class StaffController {

    private final StaffSalaryService staffSalaryService;

    /** One attendance row per staff member for the given day (defaults to today). */
    @GetMapping("/attendance")
    public ResponseEntity<List<AttendanceRowDto>> getAttendance(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(staffSalaryService.getAttendance(date));
    }

    /** Marks attendance for one or more staff members on a day. */
    @PostMapping("/attendance")
    public ResponseEntity<List<AttendanceRowDto>> markAttendance(
            @Valid @RequestBody AttendanceMarkRequest request) {
        return ResponseEntity.ok(staffSalaryService.markAttendance(request));
    }

    /** Salary summary for the month (YYYY-MM, defaults to the current month). */
    @GetMapping("/salary")
    public ResponseEntity<List<SalarySummaryDto>> getSalary(
            @RequestParam(required = false) String month) {
        String target = (month == null || month.isBlank())
                ? java.time.YearMonth.now().toString()
                : month;
        return ResponseEntity.ok(staffSalaryService.getSalary(target));
    }

    /** Records a salary payment for one staff member. */
    @PostMapping("/salary/pay")
    public ResponseEntity<List<SalarySummaryDto>> paySalary(
            @Valid @RequestBody SalaryPayRequest request) {
        return ResponseEntity.ok(staffSalaryService.paySalary(request));
    }
}

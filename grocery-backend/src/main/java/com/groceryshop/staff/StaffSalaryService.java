package com.groceryshop.staff;

import com.groceryshop.dto.AttendanceMarkRequest;
import com.groceryshop.dto.AttendanceRowDto;
import com.groceryshop.dto.SalaryPayRequest;
import com.groceryshop.dto.SalarySummaryDto;
import com.groceryshop.exception.BadRequestException;
import com.groceryshop.exception.ResourceNotFoundException;
import com.groceryshop.user.Role;
import com.groceryshop.user.User;
import com.groceryshop.user.UserRepository;
import com.groceryshop.util.CurrentUserUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Daily attendance and monthly salary calculation for staff. */
@Service
@RequiredArgsConstructor
public class StaffSalaryService {

    private static final Set<String> STATUSES = Set.of("PRESENT", "HALF_DAY", "LEAVE", "ABSENT");
    private static final BigDecimal HALF = new BigDecimal("0.5");

    private final AttendanceRepository attendanceRepository;
    private final SalaryPaymentRepository salaryPaymentRepository;
    private final UserRepository userRepository;
    private final CurrentUserUtil currentUserUtil;

    /** One row per staff member for the given day (today when null). */
    public List<AttendanceRowDto> getAttendance(LocalDate date) {
        LocalDate day = date != null ? date : LocalDate.now();
        Map<Long, Attendance> byUser = attendanceRepository.findByAttendanceDate(day).stream()
                .collect(Collectors.toMap(a -> a.getUser().getId(), a -> a));
        return userRepository.findAll().stream()
                .sorted(Comparator.comparing(User::getFullName, String.CASE_INSENSITIVE_ORDER))
                .map(user -> {
                    Attendance record = byUser.get(user.getId());
                    return AttendanceRowDto.builder()
                            .userId(user.getId())
                            .userName(user.getFullName())
                            .role(user.getRole().name())
                            .date(day)
                            .status(record != null ? record.getStatus() : null)
                            .notes(record != null ? record.getNotes() : null)
                            .build();
                })
                .toList();
    }

    /** Creates or updates the attendance entries for one day. */
    @Transactional
    public List<AttendanceRowDto> markAttendance(AttendanceMarkRequest request) {
        User admin = currentUserUtil.getCurrentUser();
        LocalDate day = request.getDate();

        for (AttendanceMarkRequest.Entry entry : request.getEntries()) {
            String status = entry.getStatus() == null
                    ? ""
                    : entry.getStatus().trim().toUpperCase(Locale.ENGLISH);
            if (!STATUSES.contains(status)) {
                throw new BadRequestException("Unknown attendance status: " + entry.getStatus());
            }
            User user = userRepository.findById(entry.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Staff member not found: " + entry.getUserId()));

            Attendance attendance = attendanceRepository
                    .findByUserIdAndAttendanceDate(user.getId(), day)
                    .orElseGet(() -> Attendance.builder()
                            .user(user)
                            .attendanceDate(day)
                            .createdAt(LocalDateTime.now())
                            .build());
            attendance.setStatus(status);
            attendance.setNotes(entry.getNotes());
            attendance.setRecordedBy(admin);
            attendanceRepository.save(attendance);
        }
        return getAttendance(day);
    }

    /** Salary summary for every staff member (and any admin with a salary set). */
    public List<SalarySummaryDto> getSalary(String month) {
        YearMonth yearMonth = parseMonth(month);
        List<Attendance> records = attendanceRepository.findByAttendanceDateBetween(
                yearMonth.atDay(1), yearMonth.atEndOfMonth());
        Map<Long, List<Attendance>> byUser = records.stream()
                .collect(Collectors.groupingBy(a -> a.getUser().getId()));
        Map<Long, SalaryPayment> payments = salaryPaymentRepository
                .findBySalaryMonth(yearMonth.toString()).stream()
                .collect(Collectors.toMap(p -> p.getUser().getId(), p -> p));
        int workingDays = workingDays(yearMonth);

        return userRepository.findAll().stream()
                .filter(user -> user.getRole() == Role.STAFF || user.getMonthlySalary() != null)
                .sorted(Comparator.comparing(User::getFullName, String.CASE_INSENSITIVE_ORDER))
                .map(user -> summarize(user, yearMonth, workingDays,
                        byUser.getOrDefault(user.getId(), List.of()), payments.get(user.getId())))
                .toList();
    }

    /** Records (or updates) the salary payment for one staff member and month. */
    @Transactional
    public List<SalarySummaryDto> paySalary(SalaryPayRequest request) {
        YearMonth yearMonth = parseMonth(request.getMonth());
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Staff member not found: " + request.getUserId()));

        SalarySummaryDto summary = getSalary(yearMonth.toString()).stream()
                .filter(row -> row.getUserId().equals(user.getId()))
                .findFirst()
                .orElseThrow(() -> new BadRequestException(
                        "Set a monthly salary for this staff member first."));

        BigDecimal base = summary.getMonthlySalary() != null
                ? summary.getMonthlySalary()
                : BigDecimal.ZERO;
        BigDecimal bonus = request.getBonus() != null ? request.getBonus() : BigDecimal.ZERO;
        BigDecimal deductions = request.getDeductions() != null
                ? request.getDeductions()
                : summary.getComputedDeductions();
        BigDecimal net = base.subtract(deductions).add(bonus).max(BigDecimal.ZERO);
        BigDecimal paid = request.getPaidAmount() != null ? request.getPaidAmount() : net;

        SalaryPayment payment = salaryPaymentRepository
                .findByUserIdAndSalaryMonth(user.getId(), yearMonth.toString())
                .orElseGet(() -> SalaryPayment.builder()
                        .user(user)
                        .salaryMonth(yearMonth.toString())
                        .createdAt(LocalDateTime.now())
                        .build());

        payment.setBaseSalary(base);
        payment.setWorkingDays(summary.getWorkingDays());
        payment.setPresentDays(summary.getPresentDays());
        payment.setHalfDays(summary.getHalfDays());
        payment.setLeaveDays(summary.getLeaveDays());
        payment.setAbsentDays(summary.getAbsentDays());
        payment.setDeductions(deductions);
        payment.setBonus(bonus);
        payment.setNetPayable(net);
        payment.setPaidAmount(paid);
        payment.setPaidOn(LocalDate.now());
        payment.setNotes(request.getNotes());
        payment.setCreatedBy(currentUserUtil.getCurrentUser());
        salaryPaymentRepository.save(payment);

        return getSalary(yearMonth.toString());
    }

    private SalarySummaryDto summarize(User user, YearMonth yearMonth, int workingDays,
                                       List<Attendance> records, SalaryPayment payment) {
        long present = records.stream().filter(a -> "PRESENT".equals(a.getStatus())).count();
        long half = records.stream().filter(a -> "HALF_DAY".equals(a.getStatus())).count();
        long leave = records.stream().filter(a -> "LEAVE".equals(a.getStatus())).count();
        long absent = records.stream().filter(a -> "ABSENT".equals(a.getStatus())).count();

        BigDecimal base = payment != null
                ? payment.getBaseSalary()
                : (user.getMonthlySalary() != null ? user.getMonthlySalary() : BigDecimal.ZERO);

        BigDecimal deductionDays = BigDecimal.valueOf(absent)
                .add(BigDecimal.valueOf(half).multiply(HALF));
        BigDecimal computed = BigDecimal.ZERO;
        if (workingDays > 0) {
            computed = base.multiply(deductionDays)
                    .divide(BigDecimal.valueOf(workingDays), 2, RoundingMode.HALF_UP);
        }
        computed = computed.min(base);

        SalarySummaryDto.SalarySummaryDtoBuilder builder = SalarySummaryDto.builder()
                .userId(user.getId())
                .userName(user.getFullName())
                .role(user.getRole().name())
                .month(yearMonth.toString())
                .monthlySalary(base)
                .workingDays(payment != null ? payment.getWorkingDays() : workingDays)
                .presentDays(payment != null ? payment.getPresentDays() : BigDecimal.valueOf(present))
                .halfDays(payment != null ? payment.getHalfDays() : BigDecimal.valueOf(half))
                .leaveDays(payment != null ? payment.getLeaveDays() : BigDecimal.valueOf(leave))
                .absentDays(payment != null ? payment.getAbsentDays() : BigDecimal.valueOf(absent))
                .computedDeductions(computed);

        if (payment != null) {
            return builder
                    .deductions(payment.getDeductions())
                    .bonus(payment.getBonus())
                    .netPayable(payment.getNetPayable())
                    .paid(true)
                    .paidAmount(payment.getPaidAmount())
                    .paidOn(payment.getPaidOn())
                    .notes(payment.getNotes())
                    .build();
        }

        return builder
                .deductions(computed)
                .bonus(BigDecimal.ZERO)
                .netPayable(base.subtract(computed).max(BigDecimal.ZERO))
                .paid(false)
                .build();
    }

    /** Days counted for the month: elapsed days for the current month, 0 for a future month. */
    private int workingDays(YearMonth yearMonth) {
        YearMonth current = YearMonth.now();
        if (yearMonth.equals(current)) {
            return LocalDate.now().getDayOfMonth();
        }
        if (yearMonth.isAfter(current)) {
            return 0;
        }
        return yearMonth.lengthOfMonth();
    }

    private YearMonth parseMonth(String month) {
        try {
            return YearMonth.parse(month == null ? "" : month.trim());
        } catch (Exception ex) {
            throw new BadRequestException("Month must be in YYYY-MM format.");
        }
    }
}

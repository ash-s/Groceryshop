package com.groceryshop.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

/** One staff member's attendance row for a given day (status null when not marked). */
@Data
@Builder
public class AttendanceRowDto {

    private Long userId;
    private String userName;
    private String role;
    private LocalDate date;
    /** PRESENT, HALF_DAY, LEAVE or ABSENT; null when not recorded yet. */
    private String status;
    private String notes;
}

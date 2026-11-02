package com.groceryshop.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/** Marks attendance for several staff members on one day (upsert). */
@Data
public class AttendanceMarkRequest {

    @NotNull(message = "Date is required")
    private LocalDate date;

    @NotEmpty(message = "At least one entry is required")
    @Valid
    private List<Entry> entries;

    @Data
    public static class Entry {

        @NotNull(message = "Staff member is required")
        private Long userId;

        /** PRESENT, HALF_DAY, LEAVE or ABSENT. */
        @NotNull(message = "Status is required")
        private String status;

        private String notes;
    }
}

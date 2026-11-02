package com.groceryshop.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/** One loyalty point movement shown in a customer's history. */
@Data
@Builder
public class PointEntryDto {

    private Long id;
    private Integer points;
    private String reason;
    private Long billId;
    private LocalDateTime createdAt;
}

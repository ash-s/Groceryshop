package com.groceryshop.customer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * A single loyalty point movement (earned on a bill, redeemed for a discount or
 * adjusted manually). Kept as a simple ledger so the balance on the customer can
 * always be explained.
 */
@Entity
@Table(name = "point_entries")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PointEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "bill_id")
    private Long billId;

    /** Positive when earned, negative when redeemed or adjusted down. */
    @Column(nullable = false)
    private Integer points;

    @Column(nullable = false, length = 80)
    private String reason;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}

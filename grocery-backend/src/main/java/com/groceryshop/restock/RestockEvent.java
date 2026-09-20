package com.groceryshop.restock;

import com.groceryshop.product.Product;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * One restock event: an automatic sale-time top-up (AUTO) or a manual restock /
 * received delivery (MANUAL). Persisted so the admin can review the full history.
 */
@Entity
@Table(name = "restock_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RestockEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private Integer quantity;

    /** AUTO (sale-time top-up) or MANUAL (admin restock / received delivery). */
    @Column(name = "event_type", nullable = false, length = 20)
    private String eventType;

    /** SUPPLIER / COURIER / SELF_PICKUP / OTHER — for manual restocks. */
    @Column(name = "delivery_method", length = 30)
    private String deliveryMethod;

    /** When the goods were received (manual) or when the sale triggered it (auto). */
    @Column(name = "received_at")
    private LocalDateTime receivedAt;

    @Column(name = "cost_per_unit", precision = 10, scale = 2)
    private BigDecimal costPerUnit;

    @Column(length = 500)
    private String notes;

    /** Username of the user who restocked/sold (manual: admin, auto: the staff who sold). */
    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
package com.groceryshop.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class BillDto {

    private Long id;
    private String billNumber;
    private String staffName;
    private String customerName;
    private Long customerId;
    private String customerPhone;
    private BigDecimal total;
    /** Discount (in rupees) applied to the whole bill. */
    private BigDecimal discountAmount;
    /** Loyalty points spent on this bill. */
    private Integer pointsRedeemed;
    /** Loyalty points earned on this bill. */
    private Integer pointsEarned;
    /** Rupee value of the redeemed points. */
    private BigDecimal pointsDiscount;
    private BigDecimal cashGiven;
    private String cashNotes;
    private String paymentMethod;
    private String shop;
    private LocalDateTime createdAt;
    private List<BillItemDto> items;
}

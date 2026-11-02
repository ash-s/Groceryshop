package com.groceryshop.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CreateBillRequest {

    private String customerName;

    /** Link to a remembered customer; enables loyalty points. */
    private Long customerId;

    /** Optional customer phone (used to find/create a customer when no id is given). */
    private String customerPhone;

    /** When true (default), the customer's points are applied as a discount. */
    private Boolean redeemPoints;

    private String paymentMethod;

    /** Cash the customer handed over (optional; used by the change calculator). */
    @DecimalMin(value = "0.0", message = "Cash given cannot be negative")
    private BigDecimal cashGiven;

    /** Which notes the customer gave, e.g. "500x1,100x2". */
    private String cashNotes;

    /** Discount (in rupees) applied to the whole bill (optional). */
    @DecimalMin(value = "0.0", message = "Discount cannot be negative")
    private BigDecimal discountAmount;

    @NotEmpty(message = "Bill must have at least one item")
    @Valid
    private List<BillItemRequest> items;

    @Data
    public static class BillItemRequest {

        @NotNull(message = "Product is required")
        private Long productId;

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity;
    }
}

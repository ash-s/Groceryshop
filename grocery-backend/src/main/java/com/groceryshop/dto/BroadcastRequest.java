package com.groceryshop.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** An offer / price-change message to send to customers on WhatsApp. */
@Data
public class BroadcastRequest {

    @NotBlank(message = "Message is required")
    private String message;

    /**
     * When true the message goes to every customer that has a phone number,
     * otherwise only to the given customerIds.
     */
    private boolean all = true;

    private java.util.List<Long> customerIds;
}

package com.groceryshop.dto;

import lombok.Builder;
import lombok.Data;

/** Result of a customer broadcast. */
@Data
@Builder
public class BroadcastResult {

    private int sent;
    /** Customers skipped because they have no phone number. */
    private int skipped;
    private int failed;
}

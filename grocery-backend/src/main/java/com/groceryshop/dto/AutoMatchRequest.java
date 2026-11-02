package com.groceryshop.dto;

import lombok.Data;

/** Payload for matching existing products (that have no barcode) to Open Food Facts. */
@Data
public class AutoMatchRequest {

    /** Only consider products with id greater than this cursor. Defaults to 0. */
    private Long afterId;

    /** How many products to process in this call (1-25). Defaults to 10. */
    private Integer limit;
}

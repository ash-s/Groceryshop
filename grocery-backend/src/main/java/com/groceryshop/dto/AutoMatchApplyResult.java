package com.groceryshop.dto;

import lombok.Builder;
import lombok.Data;

/** Outcome of applying reviewed barcode matches. */
@Data
@Builder
public class AutoMatchApplyResult {
    private int applied;
    /** Matches skipped because the product was gone, the code was blank, or it was already used. */
    private int skipped;
}

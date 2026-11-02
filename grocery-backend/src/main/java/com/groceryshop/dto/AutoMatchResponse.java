package com.groceryshop.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/** Result of one auto-match batch (cursor-paged so the UI can show progress). */
@Data
@Builder
public class AutoMatchResponse {

    private List<Proposal> proposals;

    /** Pass as {@code afterId} on the next call (null when there is nothing left). */
    private Long nextAfterId;

    /** Products still without a barcode after this batch. */
    private long remaining;

    /** Products examined in this batch. */
    private int processed;

    @Data
    @Builder
    public static class Proposal {
        private Long productId;
        private String productName;
        /** Suggested barcode from Open Food Facts. */
        private String code;
        private String matchedName;
        private String matchedBrand;
        private String quantity;
        private String imageUrl;
        /** 0-100 confidence that the candidate fits the product name. */
        private int score;
    }
}

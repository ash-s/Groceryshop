package com.groceryshop.dto;

import lombok.Data;

import java.util.List;

/** Applies reviewed barcode matches (from an auto-match run) to products. */
@Data
public class AutoMatchApplyRequest {

    private List<Match> matches;

    @Data
    public static class Match {
        private Long productId;
        private String code;
    }
}

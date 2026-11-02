package com.groceryshop.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/** Outcome summary of a bulk import. */
@Data
public class BulkImportResult {

    private int created;
    private int skipped;
    private List<String> createdCategories = new ArrayList<>();
    private List<Failure> failed = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Failure {
        /** 1-based row number as it appeared in the import. */
        private int row;
        private String name;
        private String reason;
    }
}
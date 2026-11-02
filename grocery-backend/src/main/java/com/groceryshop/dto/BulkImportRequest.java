package com.groceryshop.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/** Payload for bulk-importing an existing stock list (no barcodes required). */
@Data
public class BulkImportRequest {

    private List<Item> items;

    /** Min stock applied to rows that don't specify one. Defaults to 10. */
    private Integer defaultMinStock;

    /** Create categories that don't exist yet (matched by name). Defaults to true. */
    private Boolean createMissingCategories;

    /** Skip rows whose product name already exists. Defaults to true. */
    private Boolean skipExistingNames;

    @Data
    public static class Item {
        private String name;
        /** Barcode / code — optional, can stay blank. */
        private String code;
        private String brand;
        private String rack;
        /** Category name; matched to an existing category or created when allowed. */
        private String category;
        private BigDecimal price;
        private Integer stock;
        private Integer minStock;
    }
}
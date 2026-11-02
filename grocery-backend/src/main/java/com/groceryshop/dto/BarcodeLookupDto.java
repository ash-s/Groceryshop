package com.groceryshop.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Result of resolving a scanned barcode: either from the built-in catalog or,
 * as a fallback, from the online Open Food Facts database.
 */
@Data
@Builder
public class BarcodeLookupDto {

    /** CATALOG (built-in list) or OPENFOODFACTS (online lookup). */
    private String source;
    /** Catalog item id (CATALOG only). */
    private Long id;
    private String code;
    private String name;
    private String brand;
    /** Shop category name (CATALOG only — Open Food Facts categories are not mapped). */
    private String category;
    /** Pack size, e.g. "400 g" (Open Food Facts only). */
    private String quantity;
    /** Product image (Open Food Facts only). */
    private String imageUrl;
}
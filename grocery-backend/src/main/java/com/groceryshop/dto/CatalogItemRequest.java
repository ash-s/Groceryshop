package com.groceryshop.dto;

import lombok.Data;

/** Payload to add an item to the built-in barcode catalog (e.g. saved from an online search). */
@Data
public class CatalogItemRequest {
    private String code;
    private String name;
    private String brand;
    private String category;
}

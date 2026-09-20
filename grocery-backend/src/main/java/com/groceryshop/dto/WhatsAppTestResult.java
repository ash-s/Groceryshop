package com.groceryshop.dto;

/** Result of a manual test alert sent from the Restock page. */
public record WhatsAppTestResult(
        boolean enabled,
        String ownerPhone,
        String status,
        String detail) {
}
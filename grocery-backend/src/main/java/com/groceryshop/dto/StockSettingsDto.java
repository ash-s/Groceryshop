package com.groceryshop.dto;

/** Stock behavior settings, persisted to a small file (no DB table needed). */
public record StockSettingsDto(boolean autoRestockEnabled) {
}
package com.groceryshop.dto;

/**
 * Loyalty programme settings. Kept deliberately simple: how many points a
 * customer earns per ₹100 spent and what one point is worth when redeemed.
 * Persisted to a small file, like the stock settings.
 */
public record LoyaltySettingsDto(boolean enabled, int pointsPerHundred, int pointValue) {
}

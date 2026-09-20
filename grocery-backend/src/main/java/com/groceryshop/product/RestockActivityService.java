package com.groceryshop.product;

import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory record of recent restocks (manual or auto). Used only to show a
 * short-lived "Restocked +N" highlight in the admin UI, so no database table
 * or migration is needed. Entries expire automatically after a few minutes.
 */
@Component
public class RestockActivityService {

    public static final long EXPIRY_MINUTES = 10;

    private final Map<Long, Activity> recent = new ConcurrentHashMap<>();

    public void recordActivity(Long productId, int quantity, boolean auto) {
        recent.put(productId, new Activity(quantity, auto, LocalDateTime.now()));
    }

    /** Returns the recent activity for a product, or null when it expired/never happened. */
    public Activity recentFor(Long productId) {
        Activity activity = recent.get(productId);
        if (activity == null) {
            return null;
        }
        if (activity.at().isBefore(LocalDateTime.now().minusMinutes(EXPIRY_MINUTES))) {
            recent.remove(productId);
            return null;
        }
        return activity;
    }

    public record Activity(int quantity, boolean auto, LocalDateTime at) {
    }
}
package com.groceryshop.bridge;

import java.time.Instant;

/**
 * One live pairing between a desk screen and a phone.
 *
 * Created when a cashier opens the phone panel. The phone joins with either the
 * short code (typed) or the token carried inside the QR image. Everything here
 * lives in memory only: no table, no migration, and a restart simply means the
 * cashier scans the QR again.
 */
public class BridgeSession {

    /** Scanning modes the desk can ask the phone to work in. */
    public static final String MODE_BILLING = "BILLING";
    public static final String MODE_ADD_PRODUCT = "ADD_PRODUCT";
    public static final String MODE_RESTOCK = "RESTOCK";
    public static final String MODE_STOCK = "STOCK";
    /** The phone keeps the bill itself; the desk only mirrors it. */
    public static final String MODE_PHONE_BILL = "PHONE_BILL";

    private final String id;
    private final String code;
    private final String token;
    private final String ownerUsername;
    private final Instant createdAt;
    private volatile Instant lastSeen;
    private volatile boolean phoneConnected;
    private volatile String phoneLabel;
    private volatile String mode;

    public BridgeSession(String id, String code, String token, String ownerUsername) {
        this.id = id;
        this.code = code;
        this.token = token;
        this.ownerUsername = ownerUsername;
        this.createdAt = Instant.now();
        this.lastSeen = this.createdAt;
        this.mode = MODE_BILLING;
    }

    public String getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getToken() {
        return token;
    }

    public String getOwnerUsername() {
        return ownerUsername;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getLastSeen() {
        return lastSeen;
    }

    public void touch() {
        this.lastSeen = Instant.now();
    }

    public boolean isPhoneConnected() {
        return phoneConnected;
    }

    public void markPhoneConnected(String label) {
        this.phoneConnected = true;
        this.phoneLabel = label;
        this.lastSeen = Instant.now();
    }

    public String getPhoneLabel() {
        return phoneLabel;
    }

    /** The phone counts as here while it is polling or scanning, not forever. */
    public boolean isPhoneLive() {
        return phoneConnected && lastSeen.isAfter(Instant.now().minusSeconds(30));
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }
}

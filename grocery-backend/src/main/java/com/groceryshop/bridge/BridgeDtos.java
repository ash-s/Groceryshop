package com.groceryshop.bridge;

import java.math.BigDecimal;

/** Wire shapes for the phone-to-desk link. Kept together so the contract is readable. */
public final class BridgeDtos {

    private BridgeDtos() {
    }

    /** What the desk needs to draw the pairing panel. */
    public record SessionView(
            String id,
            String code,
            String phoneUrl,
            String mode,
            boolean phoneConnected,
            String phoneLabel,
            long expiresInSeconds) {
    }

    /** Phone joining: either the token from the QR, or the typed code. */
    public record JoinRequest(String code, String token, String device) {
    }

    public record JoinResponse(
            String id,
            String mode,
            String bridgeToken,
            String shopToken,
            String phoneUrl,
            boolean canBill) {
    }

    /** One scan arriving from the phone. */
    public record ScanRequest(String token, String code) {
    }

    /** Result of resolving a scan, sent both to the phone and to the desk. */
    public record ScanResult(
            boolean ok,
            String code,
            Long productId,
            String name,
            BigDecimal price,
            Integer stock,
            String message,
            String mode,
            String at) {

        public static ScanResult fail(String code, String message, String mode) {
            return new ScanResult(false, code, null, null, null, null, message, mode,
                    java.time.LocalDateTime.now().toString());
        }
    }

    public record ModeRequest(String mode) {
    }

    /** What the phone polls to know which mode the desk is in. */
    public record PhoneState(String mode, boolean active) {
    }
}

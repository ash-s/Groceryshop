package com.groceryshop.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * Response to a forgot-password request. When mail is not configured (dev mode), the
 * reset link is returned so the UI can show it directly instead of only logging it.
 */
@Getter
@Builder
public class ForgotPasswordResponse {

    private final String message;

    /** Present only when mail is simulated (MAIL_ENABLED=false), null when a real email is sent. */
    private final String resetLink;
}
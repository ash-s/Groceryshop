package com.groceryshop.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WhatsAppSettingsDto {

    private String ownerPhone;
    private boolean metaEnabled;
    private String metaToken;
    private String metaPhoneNumberId;
    private String metaTemplateName;
}
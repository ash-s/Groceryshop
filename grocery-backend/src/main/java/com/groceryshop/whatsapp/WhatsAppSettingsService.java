package com.groceryshop.whatsapp;

import com.groceryshop.dto.WhatsAppSettingsDto;
import com.groceryshop.exception.BadRequestException;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Stores the WhatsApp alert settings (admin phone number and the optional Meta
 * Cloud API credentials for real alerts). Everything is persisted to a small
 * text file next to the uploads folder as key=value lines, so no database
 * table or migration is needed. A file that only holds a phone number (the old
 * format) is still understood.
 */
@Slf4j
@Service
public class WhatsAppSettingsService {

    public static final String DEFAULT_TEMPLATE_NAME = "grocery_shop_restock_alert";

    @Value("${whatsapp.owner-phone:+919876543210}")
    private String defaultOwnerPhone;

    @Value("${whatsapp.meta-enabled:false}")
    private boolean defaultMetaEnabled;

    @Value("${whatsapp.meta-token:}")
    private String defaultMetaToken;

    @Value("${whatsapp.meta-phone-number-id:}")
    private String defaultMetaPhoneNumberId;

    @Value("${whatsapp.meta-template-name:grocery_shop_restock_alert}")
    private String defaultMetaTemplateName;

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    private Path settingsFile;
    private String ownerPhone;
    private boolean metaEnabled;
    private String metaToken;
    private String metaPhoneNumberId;
    private String metaTemplateName;

    @PostConstruct
    void init() {
        settingsFile = Paths.get(uploadDir).toAbsolutePath().normalize().resolve("whatsapp-settings.txt");
        ownerPhone = defaultOwnerPhone;
        metaEnabled = defaultMetaEnabled;
        metaToken = defaultMetaToken;
        metaPhoneNumberId = defaultMetaPhoneNumberId;
        metaTemplateName = defaultMetaTemplateName;
        try {
            if (Files.exists(settingsFile)) {
                load();
            }
        } catch (IOException e) {
            log.warn("Could not read saved WhatsApp settings: {}", e.getMessage());
        }
    }

    private void load() throws IOException {
        for (String raw : Files.readAllLines(settingsFile)) {
            String line = raw.trim();
            if (line.isBlank()) {
                continue;
            }
            int eq = line.indexOf('=');
            if (eq < 0) {
                // Legacy format: the whole file was just the phone number.
                ownerPhone = line;
                continue;
            }
            String key = line.substring(0, eq).trim();
            String value = line.substring(eq + 1).trim();
            switch (key) {
                case "ownerPhone" -> ownerPhone = value;
                case "metaEnabled" -> metaEnabled = Boolean.parseBoolean(value);
                case "metaToken" -> metaToken = value;
                case "metaPhoneNumberId" -> metaPhoneNumberId = value;
                case "metaTemplateName" -> metaTemplateName = value.isBlank() ? DEFAULT_TEMPLATE_NAME : value;
                default -> { /* ignore unknown keys */ }
            }
        }
    }

    private void save() {
        try {
            Files.createDirectories(settingsFile.getParent());
            Map<String, String> values = new LinkedHashMap<>();
            values.put("ownerPhone", ownerPhone);
            values.put("metaEnabled", String.valueOf(metaEnabled));
            values.put("metaToken", nullToEmpty(metaToken));
            values.put("metaPhoneNumberId", nullToEmpty(metaPhoneNumberId));
            values.put("metaTemplateName", getMetaTemplateName());
            StringBuilder sb = new StringBuilder();
            values.forEach((k, v) -> sb.append(k).append('=').append(v).append(System.lineSeparator()));
            Files.writeString(settingsFile, sb.toString());
        } catch (IOException e) {
            log.error("Could not save WhatsApp settings: {}", e.getMessage());
        }
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    public String getOwnerPhone() {
        return ownerPhone;
    }

    public boolean isMetaEnabled() {
        return metaEnabled;
    }

    public String getMetaToken() {
        return nullToEmpty(metaToken);
    }

    public String getMetaPhoneNumberId() {
        return nullToEmpty(metaPhoneNumberId);
    }

    public String getMetaTemplateName() {
        return metaTemplateName == null || metaTemplateName.isBlank() ? DEFAULT_TEMPLATE_NAME : metaTemplateName.trim();
    }

    public WhatsAppSettingsDto toDto() {
        return new WhatsAppSettingsDto(ownerPhone, metaEnabled, getMetaToken(),
                getMetaPhoneNumberId(), getMetaTemplateName());
    }

    public WhatsAppSettingsDto updateSettings(WhatsAppSettingsDto request) {
        String normalized = normalizePhone(request.getOwnerPhone());
        String token = nullToEmpty(request.getMetaToken()).trim();
        String phoneId = nullToEmpty(request.getMetaPhoneNumberId()).trim();
        boolean enable = request.isMetaEnabled();
        if (enable && (token.isBlank() || phoneId.isBlank())) {
            throw new BadRequestException(
                    "To turn on real Meta alerts, enter both the access token and the phone number ID.");
        }
        ownerPhone = normalized;
        metaEnabled = enable;
        metaToken = token;
        metaPhoneNumberId = phoneId;
        metaTemplateName = request.getMetaTemplateName() == null || request.getMetaTemplateName().isBlank()
                ? DEFAULT_TEMPLATE_NAME : request.getMetaTemplateName().trim();
        save();
        return toDto();
    }

    private String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            throw new BadRequestException("Enter a WhatsApp number with country code, e.g. +91XXXXXXXXXX");
        }
        String digits = phone.replaceAll("[^0-9+]", "");
        if (digits.length() < 10) {
            throw new BadRequestException("Enter a valid WhatsApp number with country code, e.g. +91XXXXXXXXXX");
        }
        return digits;
    }
}
package com.groceryshop.whatsapp;

import com.groceryshop.exception.BadRequestException;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Stores the WhatsApp number that receives low-stock alerts. The number can be
 * changed by the admin from the Restock page and is persisted to a small file
 * next to the uploads folder (no database table/migration needed).
 */
@Slf4j
@Service
public class WhatsAppSettingsService {

    @Value("${whatsapp.owner-phone:+919876543210}")
    private String defaultOwnerPhone;

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    private Path settingsFile;
    private String ownerPhone;

    @PostConstruct
    void init() {
        settingsFile = Paths.get(uploadDir).toAbsolutePath().normalize().resolve("whatsapp-settings.txt");
        ownerPhone = defaultOwnerPhone;
        try {
            if (Files.exists(settingsFile)) {
                String stored = Files.readString(settingsFile).trim();
                if (!stored.isBlank()) {
                    ownerPhone = stored;
                }
            }
        } catch (IOException e) {
            log.warn("Could not read saved WhatsApp number: {}", e.getMessage());
        }
    }

    public String getOwnerPhone() {
        return ownerPhone;
    }

    public String updateOwnerPhone(String phone) {
        String normalized = normalizePhone(phone);
        ownerPhone = normalized;
        try {
            Files.createDirectories(settingsFile.getParent());
            Files.writeString(settingsFile, normalized);
        } catch (IOException e) {
            log.error("Could not save WhatsApp number: {}", e.getMessage());
        }
        return ownerPhone;
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
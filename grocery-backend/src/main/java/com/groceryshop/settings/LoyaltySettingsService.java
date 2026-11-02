package com.groceryshop.settings;

import com.groceryshop.dto.LoyaltySettingsDto;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Loyalty programme settings, stored in uploads/loyalty-settings.txt as key=value
 * lines (same idea as the stock and WhatsApp settings files). Defaults: enabled,
 * 1 point per ₹100 spent, 1 point = ₹1 off.
 */
@Slf4j
@Service
public class LoyaltySettingsService {

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    @Value("${loyalty.enabled:true}")
    private boolean defaultEnabled;

    @Value("${loyalty.points-per-hundred:1}")
    private int defaultPointsPerHundred;

    @Value("${loyalty.point-value:1}")
    private int defaultPointValue;

    private Path settingsFile;
    private boolean enabled;
    private int pointsPerHundred;
    private int pointValue;

    @PostConstruct
    void init() {
        settingsFile = Paths.get(uploadDir).toAbsolutePath().normalize().resolve("loyalty-settings.txt");
        enabled = defaultEnabled;
        pointsPerHundred = defaultPointsPerHundred;
        pointValue = defaultPointValue;
        try {
            if (Files.exists(settingsFile)) {
                for (String raw : Files.readAllLines(settingsFile)) {
                    String line = raw.trim();
                    if (line.isBlank()) {
                        continue;
                    }
                    int eq = line.indexOf('=');
                    if (eq < 0) {
                        continue;
                    }
                    String key = line.substring(0, eq).trim();
                    String value = line.substring(eq + 1).trim();
                    switch (key) {
                        case "enabled" -> enabled = Boolean.parseBoolean(value);
                        case "pointsPerHundred" -> pointsPerHundred = parseInt(value, pointsPerHundred);
                        case "pointValue" -> pointValue = parseInt(value, pointValue);
                        default -> { }
                    }
                }
            }
        } catch (IOException e) {
            log.warn("Could not read saved loyalty settings: {}", e.getMessage());
        }
    }

    private static int parseInt(String value, int fallback) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private void save() {
        try {
            Files.createDirectories(settingsFile.getParent());
            Files.writeString(settingsFile,
                    "enabled=" + enabled + System.lineSeparator()
                            + "pointsPerHundred=" + pointsPerHundred + System.lineSeparator()
                            + "pointValue=" + pointValue + System.lineSeparator());
        } catch (IOException e) {
            log.error("Could not save loyalty settings: {}", e.getMessage());
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    public int getPointsPerHundred() {
        return pointsPerHundred;
    }

    public int getPointValue() {
        return pointValue;
    }

    public LoyaltySettingsDto toDto() {
        return new LoyaltySettingsDto(enabled, pointsPerHundred, pointValue);
    }

    public LoyaltySettingsDto updateSettings(LoyaltySettingsDto request) {
        enabled = request.enabled();
        pointsPerHundred = Math.max(0, request.pointsPerHundred());
        pointValue = Math.max(0, request.pointValue());
        save();
        return toDto();
    }
}

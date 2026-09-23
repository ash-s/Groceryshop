package com.groceryshop.settings;

import com.groceryshop.dto.StockSettingsDto;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

/**
 * Simple file-backed setting for how stock behaves when a sale drops an item to
 * its minimum: auto-restock (add the sold quantity back) or manual only (staff
 * restock manually, alerts still fire). Persisted to uploads/app-settings.txt as
 * key=value lines, following the same pattern as the WhatsApp settings file.
 */
@Slf4j
@Service
public class StockSettingsService {

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    @Value("${stock.auto-restock:true}")
    private boolean defaultAutoRestock;

    private Path settingsFile;
    private boolean autoRestockEnabled;

    @PostConstruct
    void init() {
        settingsFile = Paths.get(uploadDir).toAbsolutePath().normalize().resolve("app-settings.txt");
        autoRestockEnabled = defaultAutoRestock;
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
                    if ("autoRestockEnabled".equals(key)) {
                        autoRestockEnabled = Boolean.parseBoolean(value);
                    }
                }
            }
        } catch (IOException e) {
            log.warn("Could not read saved stock settings: {}", e.getMessage());
        }
    }

    private void save() {
        try {
            Files.createDirectories(settingsFile.getParent());
            Files.writeString(settingsFile,
                    "autoRestockEnabled=" + autoRestockEnabled + System.lineSeparator());
        } catch (IOException e) {
            log.error("Could not save stock settings: {}", e.getMessage());
        }
    }

    public boolean isAutoRestockEnabled() {
        return autoRestockEnabled;
    }

    public StockSettingsDto toDto() {
        return new StockSettingsDto(autoRestockEnabled);
    }

    public StockSettingsDto updateSettings(StockSettingsDto request) {
        autoRestockEnabled = request.autoRestockEnabled();
        save();
        return toDto();
    }
}
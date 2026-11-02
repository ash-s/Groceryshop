package com.groceryshop.settings;

import com.groceryshop.dto.LoyaltySettingsDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings/loyalty")
@RequiredArgsConstructor
public class LoyaltySettingsController {

    private final LoyaltySettingsService loyaltySettingsService;

    @GetMapping
    public ResponseEntity<LoyaltySettingsDto> get() {
        return ResponseEntity.ok(loyaltySettingsService.toDto());
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<LoyaltySettingsDto> update(@RequestBody LoyaltySettingsDto request) {
        return ResponseEntity.ok(loyaltySettingsService.updateSettings(request));
    }
}

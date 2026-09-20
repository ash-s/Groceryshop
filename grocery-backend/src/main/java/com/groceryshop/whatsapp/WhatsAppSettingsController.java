package com.groceryshop.whatsapp;

import com.groceryshop.dto.WhatsAppSettingsDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/settings/whatsapp")
@RequiredArgsConstructor
public class WhatsAppSettingsController {

    private final WhatsAppSettingsService settingsService;

    @GetMapping
    public ResponseEntity<WhatsAppSettingsDto> get() {
        return ResponseEntity.ok(new WhatsAppSettingsDto(settingsService.getOwnerPhone()));
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<WhatsAppSettingsDto> update(@RequestBody WhatsAppSettingsDto request) {
        return ResponseEntity.ok(new WhatsAppSettingsDto(settingsService.updateOwnerPhone(request.getOwnerPhone())));
    }
}
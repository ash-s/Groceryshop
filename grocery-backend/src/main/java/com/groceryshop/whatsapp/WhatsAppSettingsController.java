package com.groceryshop.whatsapp;

import com.groceryshop.dto.WhatsAppSettingsDto;
import com.groceryshop.dto.WhatsAppTestResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings/whatsapp")
@RequiredArgsConstructor
public class WhatsAppSettingsController {

    private final WhatsAppSettingsService settingsService;
    private final WhatsAppService whatsAppService;

    @GetMapping
    public ResponseEntity<WhatsAppSettingsDto> get() {
        return ResponseEntity.ok(settingsService.toDto());
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<WhatsAppSettingsDto> update(@RequestBody WhatsAppSettingsDto request) {
        return ResponseEntity.ok(settingsService.updateSettings(request));
    }

    @PostMapping("/test")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<WhatsAppTestResult> sendTest() {
        return ResponseEntity.ok(whatsAppService.sendTestAlert());
    }
}
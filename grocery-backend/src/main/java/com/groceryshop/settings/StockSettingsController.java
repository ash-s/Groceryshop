package com.groceryshop.settings;

import com.groceryshop.dto.StockSettingsDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/settings/stock")
@RequiredArgsConstructor
public class StockSettingsController {

    private final StockSettingsService stockSettingsService;

    @GetMapping
    public ResponseEntity<StockSettingsDto> get() {
        return ResponseEntity.ok(stockSettingsService.toDto());
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<StockSettingsDto> update(@RequestBody StockSettingsDto request) {
        return ResponseEntity.ok(stockSettingsService.updateSettings(request));
    }
}
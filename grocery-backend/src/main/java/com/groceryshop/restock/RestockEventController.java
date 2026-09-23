package com.groceryshop.restock;

import com.groceryshop.dto.RestockEventDto;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/restock-events")
@RequiredArgsConstructor
public class RestockEventController {

    private final RestockHistoryService restockHistoryService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RestockEventDto>> getAll() {
        return ResponseEntity.ok(restockHistoryService.getAll());
    }

    /** Pending deliveries — staff and admin both see these (in-app alert banner). */
    @GetMapping("/pending")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<RestockEventDto>> getPending() {
        return ResponseEntity.ok(restockHistoryService.getPending());
    }

    /** Confirms a pending delivery as received and adds its quantity to stock. */
    @PutMapping("/{id}/deliver")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RestockEventDto> markDelivered(
            @PathVariable Long id,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate receivedDate) {
        return ResponseEntity.ok(restockHistoryService.markDelivered(id, receivedDate));
    }
}
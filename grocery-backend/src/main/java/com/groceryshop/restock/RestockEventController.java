package com.groceryshop.restock;

import com.groceryshop.dto.RestockEventDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/restock-events")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class RestockEventController {

    private final RestockHistoryService restockHistoryService;

    @GetMapping
    public ResponseEntity<List<RestockEventDto>> getAll() {
        return ResponseEntity.ok(restockHistoryService.getAll());
    }
}
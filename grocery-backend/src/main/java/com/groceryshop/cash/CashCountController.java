package com.groceryshop.cash;

import com.groceryshop.dto.CashCountDto;
import com.groceryshop.dto.CashCountRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/cash-counts")
@RequiredArgsConstructor
public class CashCountController {

    private final CashCountService cashCountService;

    @GetMapping
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<CashCountDto> get(@RequestParam(required = false) String date) {
        LocalDate day = date != null && !date.isBlank() ? LocalDate.parse(date) : LocalDate.now();
        return ResponseEntity.ok(cashCountService.getForDate(day));
    }

    @GetMapping("/recent")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<List<CashCountDto>> recent() {
        return ResponseEntity.ok(cashCountService.recent());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<CashCountDto> save(@RequestBody CashCountRequest request) {
        return ResponseEntity.ok(cashCountService.save(request));
    }
}

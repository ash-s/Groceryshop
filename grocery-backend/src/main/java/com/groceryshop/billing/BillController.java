package com.groceryshop.billing;

import com.groceryshop.dto.BillDto;
import com.groceryshop.dto.CreateBillRequest;
import com.groceryshop.dto.SalesReportDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/bills")
@RequiredArgsConstructor
public class BillController {

    private final BillService billService;

    @PostMapping
    @PreAuthorize("hasRole('STAFF')")
    public ResponseEntity<BillDto> create(@Valid @RequestBody CreateBillRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(billService.createBill(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<List<BillDto>> getAll() {
        return ResponseEntity.ok(billService.getAllBills());
    }

    @GetMapping("/reports/weekly")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SalesReportDto> getWeeklyReport() {
        return ResponseEntity.ok(billService.getWeeklyReport());
    }

    @GetMapping("/reports/monthly")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SalesReportDto> getMonthlyReport() {
        return ResponseEntity.ok(billService.getMonthlyReport());
    }
}
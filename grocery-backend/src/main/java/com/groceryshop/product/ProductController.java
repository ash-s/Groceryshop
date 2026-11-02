package com.groceryshop.product;

import com.groceryshop.dto.AutoMatchApplyRequest;
import com.groceryshop.dto.AutoMatchApplyResult;
import com.groceryshop.dto.AutoMatchRequest;
import com.groceryshop.dto.AutoMatchResponse;
import com.groceryshop.dto.BulkImportRequest;
import com.groceryshop.dto.BulkImportResult;
import com.groceryshop.dto.ProductDto;
import com.groceryshop.dto.ProductRequest;
import com.groceryshop.dto.RestockRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<List<ProductDto>> getAll(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String shop) {
        return ResponseEntity.ok(productService.getAll(categoryId, search, shop));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getById(id));
    }

    @GetMapping("/low-stock/check")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ProductDto>> getLowStock() {
        return ResponseEntity.ok(productService.getLowStock());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductDto> create(@Valid @RequestBody ProductRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.create(request));
    }

    @PostMapping("/bulk-import")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BulkImportResult> bulkImport(@RequestBody BulkImportRequest request) {
        return ResponseEntity.ok(productService.bulkImport(request));
    }

    /** One cursor-paged batch of barcode suggestions (Open Food Facts) for uncoded products. */
    @PostMapping("/auto-match-barcodes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AutoMatchResponse> autoMatchBarcodes(
            @RequestBody(required = false) AutoMatchRequest request) {
        return ResponseEntity.ok(productService.autoMatchBarcodes(request));
    }

    /** Applies reviewed barcode suggestions to products. */
    @PostMapping("/auto-match-barcodes/apply")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AutoMatchApplyResult> applyBarcodeMatches(
            @RequestBody AutoMatchApplyRequest request) {
        return ResponseEntity.ok(productService.applyBarcodeMatches(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductDto> update(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return ResponseEntity.ok(productService.update(id, request));
    }

    @PatchMapping("/{id}/stock")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductDto> updateStock(@PathVariable Long id, @RequestParam Integer stock) {
        return ResponseEntity.ok(productService.updateStock(id, stock));
    }

    @PatchMapping("/{id}/restock")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductDto> restock(@PathVariable Long id, @Valid @RequestBody(required = false) RestockRequest request) {
        return ResponseEntity.ok(productService.restock(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        productService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
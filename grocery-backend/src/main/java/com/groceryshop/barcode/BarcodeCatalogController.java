package com.groceryshop.barcode;

import com.groceryshop.dto.BarcodeDto;
import com.groceryshop.dto.BarcodeLookupDto;
import com.groceryshop.dto.CatalogItemRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/barcodes")
@RequiredArgsConstructor
public class BarcodeCatalogController {

    private final BarcodeCatalogService barcodeCatalogService;

    /** Browse the built-in catalog (optionally filtered). */
    @GetMapping("/catalog")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<BarcodeDto>> catalog(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(barcodeCatalogService.list(search, category));
    }

    /** Resolve a scanned barcode to a catalog item, 404 when unknown. */
    @GetMapping("/lookup")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BarcodeDto> lookup(@RequestParam String code) {
        return ResponseEntity.ok(barcodeCatalogService.lookup(code));
    }

    /** Resolve a scanned barcode: built-in catalog first, then Open Food Facts online. */
    @GetMapping("/resolve")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BarcodeLookupDto> resolve(@RequestParam String code) {
        return ResponseEntity.ok(barcodeCatalogService.resolve(code));
    }

    /** Search Open Food Facts by product name (add results as products / catalog items). */
    @GetMapping("/search")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<BarcodeLookupDto>> search(
            @RequestParam String q,
            @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(barcodeCatalogService.searchOnline(q, limit));
    }

    /** Add an item to the built-in catalog (e.g. saved from an online search). */
    @PostMapping("/catalog")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BarcodeDto> createCatalogItem(@RequestBody CatalogItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(barcodeCatalogService.create(request));
    }

    /** Attach/update a barcode on a catalog item (scan-to-set). */
    @PutMapping("/catalog/{id}/code")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BarcodeDto> setCode(@PathVariable Long id, @RequestParam String code) {
        return ResponseEntity.ok(barcodeCatalogService.setCode(id, code));
    }
}
package com.groceryshop.barcode;

import com.groceryshop.dto.BarcodeDto;
import com.groceryshop.dto.BarcodeLookupDto;
import com.groceryshop.dto.CatalogItemRequest;
import com.groceryshop.exception.BadRequestException;
import com.groceryshop.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class BarcodeCatalogService {

    private final BarcodeCatalogRepository barcodeCatalogRepository;
    private final OpenFoodFactsService openFoodFactsService;

    public List<BarcodeDto> list(String search, String category) {
        String term = search == null ? null : search.trim().toLowerCase();
        String cat = category == null ? null : category.trim();
        return barcodeCatalogRepository.findAll().stream()
                .filter(b -> cat == null || cat.isEmpty()
                        || (b.getCategory() != null && b.getCategory().equalsIgnoreCase(cat)))
                .filter(b -> term == null || term.isEmpty()
                        || (b.getName() != null && b.getName().toLowerCase().contains(term))
                        || (b.getBrand() != null && b.getBrand().toLowerCase().contains(term))
                        || (b.getCode() != null && b.getCode().toLowerCase().contains(term)))
                .map(this::toDto)
                .toList();
    }

    public BarcodeDto lookup(String code) {
        if (code == null || code.isBlank()) {
            throw new BadRequestException("Barcode is required.");
        }
        return barcodeCatalogRepository.findByCodeIgnoreCase(code.trim())
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Barcode not found in catalog"));
    }

    /**
     * Resolve a scanned barcode: first the built-in catalog, then (as a fallback)
     * the online Open Food Facts database. 404 when neither knows the code.
     */
    public BarcodeLookupDto resolve(String code) {
        if (code == null || code.isBlank()) {
            throw new BadRequestException("Barcode is required.");
        }
        String trimmed = code.trim();

        Optional<BarcodeCatalog> local = barcodeCatalogRepository.findByCodeIgnoreCase(trimmed);
        if (local.isPresent()) {
            BarcodeCatalog b = local.get();
            return BarcodeLookupDto.builder()
                    .source("CATALOG")
                    .id(b.getId())
                    .code(b.getCode())
                    .name(b.getName())
                    .brand(b.getBrand())
                    .category(b.getCategory())
                    .build();
        }

        return openFoodFactsService.lookup(trimmed)
                .map(product -> {
                    String name = firstNonBlank(
                            product.productNameEn(),
                            product.productName(),
                            product.genericName());
                    if (name == null) {
                        return null;
                    }
                    return BarcodeLookupDto.builder()
                            .source("OPENFOODFACTS")
                            .code(trimmed)
                            .name(name)
                            .brand(firstBrand(product.brands()))
                            .quantity(cleanQuantity(product.quantity()))
                            .imageUrl(blankToNull(product.imageFrontSmallUrl()))
                            .build();
                })
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Barcode not found in the catalog or Open Food Facts"));
    }

    /**
     * Online name search against Open Food Facts (Search-a-licious). Results are
     * normalized the same way as {@link #resolve(String)} so the UI can treat them
     * identically. Empty query is rejected; an unreachable API yields an empty list.
     */
    public List<BarcodeLookupDto> searchOnline(String query, Integer limit) {
        String q = query == null ? "" : query.trim();
        if (q.isEmpty()) {
            throw new BadRequestException("Enter a product name to search for.");
        }
        int size = limit == null || limit <= 0 ? 20 : limit;

        List<BarcodeLookupDto> results = new ArrayList<>();
        Set<String> seenCodes = new HashSet<>();
        for (OpenFoodFactsService.OffSearchHit hit : openFoodFactsService.search(q, size)) {
            String name = firstNonBlank(hit.productNameEn(), hit.productName(), hit.genericName());
            if (name == null) {
                continue;
            }
            String code = blankToNull(hit.code());
            if (code != null && !seenCodes.add(code)) {
                continue;
            }
            String brand = hit.brands() == null || hit.brands().isEmpty()
                    ? null
                    : blankToNull(hit.brands().get(0));
            results.add(BarcodeLookupDto.builder()
                    .source("OPENFOODFACTS")
                    .code(code)
                    .name(name)
                    .brand(brand)
                    .quantity(cleanQuantity(hit.quantity()))
                    .imageUrl(blankToNull(hit.imageFrontSmallUrl()))
                    .build());
        }
        return results;
    }

    /** Adds an item to the built-in catalog (e.g. saved from an online search). */
    public BarcodeDto create(CatalogItemRequest request) {
        if (request == null || request.getName() == null || request.getName().isBlank()) {
            throw new BadRequestException("Name is required.");
        }
        String code = blankToNull(request.getCode());
        if (code != null && barcodeCatalogRepository.findByCodeIgnoreCase(code).isPresent()) {
            throw new BadRequestException("That barcode is already in the catalog.");
        }
        BarcodeCatalog entry = BarcodeCatalog.builder()
                .code(code)
                .name(request.getName().trim())
                .brand(blankToNull(request.getBrand()))
                .category(blankToNull(request.getCategory()))
                .build();
        try {
            return toDto(barcodeCatalogRepository.save(entry));
        } catch (DataIntegrityViolationException ex) {
            throw new BadRequestException("That barcode is already in the catalog.");
        }
    }

    /** First non-blank value, or null. */
    private String firstNonBlank(String... values) {
        for (String value : values) {
            String trimmed = blankToNull(value);
            if (trimmed != null) {
                return trimmed;
            }
        }
        return null;
    }

    /** Open Food Facts returns brands as e.g. "Nutella, Ferrero" — take the first. */
    private String firstBrand(String brands) {
        String value = blankToNull(brands);
        if (value == null) {
            return null;
        }
        int comma = value.indexOf(',');
        return blankToNull(comma >= 0 ? value.substring(0, comma) : value);
    }

    private String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * Open Food Facts quantities often carry the EU estimated-sign mark, e.g.
     * "400 g e". Strip it so the value reads cleanly as a pack size.
     */
    private String cleanQuantity(String value) {
        String q = blankToNull(value);
        if (q == null) {
            return null;
        }
        q = q.replace("℮", "").trim();
        if (q.endsWith(" e") || q.endsWith(" E")) {
            q = q.substring(0, q.length() - 2).trim();
        }
        return q.isEmpty() ? null : q;
    }

    /** Attaches a barcode to a catalog item — used after scanning the actual packet once. */
    public BarcodeDto setCode(Long id, String code) {
        BarcodeCatalog entry = barcodeCatalogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Catalog item not found: " + id));
        String normalized = code == null ? null : code.trim();
        entry.setCode(normalized == null || normalized.isEmpty() ? null : normalized);
        try {
            return toDto(barcodeCatalogRepository.save(entry));
        } catch (DataIntegrityViolationException ex) {
            throw new BadRequestException("That barcode is already linked to another catalog item.");
        }
    }

    private BarcodeDto toDto(BarcodeCatalog b) {
        return BarcodeDto.builder()
                .id(b.getId())
                .code(b.getCode())
                .name(b.getName())
                .brand(b.getBrand())
                .category(b.getCategory())
                .build();
    }
}
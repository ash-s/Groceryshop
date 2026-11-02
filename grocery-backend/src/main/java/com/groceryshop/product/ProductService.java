package com.groceryshop.product;

import com.groceryshop.barcode.OpenFoodFactsService;
import com.groceryshop.billing.BillItemRepository;
import com.groceryshop.category.Category;
import com.groceryshop.category.CategoryRepository;
import com.groceryshop.dto.AutoMatchApplyRequest;
import com.groceryshop.dto.AutoMatchApplyResult;
import com.groceryshop.dto.AutoMatchRequest;
import com.groceryshop.dto.AutoMatchResponse;
import com.groceryshop.dto.BulkImportRequest;
import com.groceryshop.dto.BulkImportResult;
import com.groceryshop.dto.ProductDto;
import com.groceryshop.dto.ProductRequest;
import com.groceryshop.dto.RestockRequest;
import com.groceryshop.exception.BadRequestException;
import com.groceryshop.exception.ResourceNotFoundException;
import com.groceryshop.order.OrderItemRepository;
import com.groceryshop.restock.RestockHistoryService;
import com.groceryshop.supplier.Supplier;
import com.groceryshop.supplier.SupplierRepository;
import com.groceryshop.whatsapp.WhatsAppService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final SupplierRepository supplierRepository;
    private final OrderItemRepository orderItemRepository;
    private final BillItemRepository billItemRepository;
    private final RestockActivityService restockActivityService;
    private final RestockHistoryService restockHistoryService;
    private final WhatsAppService whatsAppService;
    private final OpenFoodFactsService openFoodFactsService;

    public List<ProductDto> getAll(Long categoryId, String search, String shop) {
        List<Product> products;
        if (categoryId != null) {
            products = productRepository.findByCategoryId(categoryId);
        } else if (search != null && !search.isBlank()) {
            products = productRepository.search(search);
        } else {
            products = productRepository.findAll();
        }
        // Optional shop filter: blank or "ALL" means both shops.
        if (shop != null && !shop.isBlank() && !"ALL".equalsIgnoreCase(shop.trim())) {
            String target = normalizeShop(shop);
            products = products.stream().filter(product -> target.equals(product.getShop())).toList();
        }
        Map<Long, Long> sold = soldByProduct();
        return products.stream().map(product -> toDto(product, sold)).toList();
    }

    /** GROCERY or IMOBILE; anything unknown falls back to GROCERY. */
    public static String normalizeShop(String shop) {
        if (shop == null || shop.isBlank()) {
            return "GROCERY";
        }
        return "IMOBILE".equalsIgnoreCase(shop.trim()) ? "IMOBILE" : "GROCERY";
    }

    public ProductDto getById(Long id) {
        Product product = getProduct(id);
        return toDto(product, Map.of(product.getId(), soldFor(product.getId())));
    }

    /** Products currently mapped to a supplier (current-state mapping). */
    public List<ProductDto> getBySupplier(Long supplierId) {
        Map<Long, Long> sold = soldByProduct();
        return productRepository.findBySupplierIdOrderByNameAsc(supplierId).stream()
                .map(product -> toDto(product, sold))
                .toList();
    }

    public List<ProductDto> getLowStock() {
        Map<Long, Long> sold = soldByProduct();
        return productRepository.findLowStock().stream().map(product -> toDto(product, sold)).toList();
    }

    public ProductDto create(ProductRequest request) {
        String code = blankToNull(request.getCode());
        String barcode = blankToNull(request.getBarcode());
        ensureCodeFree(code, null);
        ensureBarcodeFree(barcode, null);
        Product product = Product.builder()
                .name(request.getName())
                .code(code)
                .barcode(barcode)
                .description(request.getDescription())
                .brand(request.getBrand())
                .rack(request.getRack())
                .price(request.getPrice())
                .costPrice(request.getCostPrice())
                .expiryDate(request.getExpiryDate())
                .stock(request.getStock() != null ? request.getStock() : 0)
                .minStock(request.getMinStock() != null ? request.getMinStock() : 10)
                .imageUrl(request.getImageUrl())
                .category(resolveCategory(request.getCategoryId()))
                .supplier(resolveSupplier(request.getSupplierId()))
                .shop(normalizeShop(request.getShop()))
                .createdAt(LocalDateTime.now())
                .build();
        Product saved = productRepository.save(product);
        notifyIfLow(saved);
        return toDto(saved, Map.of(saved.getId(), soldFor(saved.getId())));
    }

    /**
     * Bulk-creates products from an existing stock list. No barcodes are required
     * (code stays blank and can be attached later by scanning). Categories are
     * matched by name and created when allowed. Low-stock alerts are intentionally
     * NOT sent here — importing opening stock should not blast hundreds of messages.
     */
    @Transactional
    public BulkImportResult bulkImport(BulkImportRequest request) {
        if (request == null || request.getItems() == null || request.getItems().isEmpty()) {
            throw new BadRequestException("No items to import.");
        }
        if (request.getItems().size() > 5000) {
            throw new BadRequestException("Too many rows in one import (max 5000). Please split the list.");
        }

        int defaultMinStock = request.getDefaultMinStock() != null ? Math.max(0, request.getDefaultMinStock()) : 10;
        boolean createMissing = request.getCreateMissingCategories() == null || request.getCreateMissingCategories();
        boolean skipExisting = request.getSkipExistingNames() == null || request.getSkipExistingNames();

        // Preload category + existing product lookups so we don't query per row.
        Map<String, Category> categoryByName = new HashMap<>();
        for (Category c : categoryRepository.findAll()) {
            categoryByName.put(c.getName().trim().toLowerCase(), c);
        }
        Set<String> existingNames = new HashSet<>();
        Set<String> existingCodes = new HashSet<>();
        for (Product p : productRepository.findAll()) {
            if (p.getName() != null) {
                existingNames.add(p.getName().trim().toLowerCase());
            }
            if (p.getCode() != null && !p.getCode().isBlank()) {
                existingCodes.add(p.getCode().trim().toLowerCase());
            }
            if (p.getBarcode() != null && !p.getBarcode().isBlank()) {
                existingCodes.add(p.getBarcode().trim().toLowerCase());
            }
        }

        BulkImportResult result = new BulkImportResult();
        List<Product> toCreate = new ArrayList<>();
        int rowNum = 0;

        for (BulkImportRequest.Item item : request.getItems()) {
            rowNum++;
            String name = item.getName() == null ? "" : item.getName().trim();
            if (name.isEmpty()) {
                result.getFailed().add(new BulkImportResult.Failure(rowNum, "", "Missing product name"));
                continue;
            }
            if (item.getPrice() == null || item.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
                result.getFailed().add(new BulkImportResult.Failure(rowNum, name, "Missing or invalid price"));
                continue;
            }
            if (skipExisting && existingNames.contains(name.toLowerCase())) {
                result.setSkipped(result.getSkipped() + 1);
                continue;
            }

            String rawCode = item.getCode() == null ? null : item.getCode().trim();
            String code = null;
            String barcode = null;
            if (rawCode != null && !rawCode.isEmpty()) {
                if (existingCodes.contains(rawCode.toLowerCase())) {
                    result.getFailed().add(new BulkImportResult.Failure(rowNum, name,
                            "Barcode/code is already used by another product"));
                    continue;
                }
                existingCodes.add(rawCode.toLowerCase());
                // A long all-digit value is a printed barcode; a short value is a
                // till code. Keeps imports consistent with the add/edit form.
                if (rawCode.matches("^[0-9]{8,}$")) {
                    barcode = rawCode;
                } else {
                    code = rawCode;
                }
            }

            Category category = null;
            String catName = item.getCategory() == null ? "" : item.getCategory().trim();
            if (!catName.isEmpty()) {
                String key = catName.toLowerCase();
                category = categoryByName.get(key);
                if (category == null && createMissing) {
                    category = categoryRepository.save(Category.builder()
                            .name(catName)
                            .createdAt(LocalDateTime.now())
                            .build());
                    categoryByName.put(key, category);
                    result.getCreatedCategories().add(category.getName());
                }
            }

            int stock = item.getStock() != null ? Math.max(0, item.getStock()) : 0;
            int minStock = item.getMinStock() != null ? Math.max(0, item.getMinStock()) : defaultMinStock;

            toCreate.add(Product.builder()
                    .name(name)
                    .code(code)
                    .barcode(barcode)
                    .brand(blankToNull(item.getBrand()))
                    .rack(blankToNull(item.getRack()))
                    .price(item.getPrice())
                    .stock(stock)
                    .minStock(minStock)
                    .category(category)
                    .createdAt(LocalDateTime.now())
                    .build());
            existingNames.add(name.toLowerCase());
        }

        if (!toCreate.isEmpty()) {
            productRepository.saveAll(toCreate);
        }
        result.setCreated(toCreate.size());
        return result;
    }

    private String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** Minimum name-similarity (0-100) for a candidate to be proposed for review. */
    private static final int MIN_MATCH_SCORE = 45;

    /**
     * Finds candidate barcodes on Open Food Facts for products that have no barcode
     * yet. Works in small cursor-paged batches so the UI can show progress and the
     * free online search service is not hammered.
     */
    public AutoMatchResponse autoMatchBarcodes(AutoMatchRequest request) {
        long afterId = request == null || request.getAfterId() == null ? 0L : request.getAfterId();
        int limit = request == null || request.getLimit() == null ? 10 : request.getLimit();
        limit = Math.min(Math.max(1, limit), 25);

        List<Product> batch = productRepository.findUncodedAfter(afterId, PageRequest.of(0, limit));
        List<AutoMatchResponse.Proposal> proposals = new ArrayList<>();
        long lastId = afterId;
        for (Product product : batch) {
            lastId = product.getId();
            bestCandidate(product.getName()).ifPresent(candidate -> proposals.add(
                    AutoMatchResponse.Proposal.builder()
                            .productId(product.getId())
                            .productName(product.getName())
                            .code(candidate.code())
                            .matchedName(candidate.name())
                            .matchedBrand(candidate.brand())
                            .quantity(candidate.quantity())
                            .imageUrl(candidate.imageUrl())
                            .score(candidate.score())
                            .build()));
            sleepBriefly();
        }

        boolean done = productRepository.findUncodedAfter(lastId, PageRequest.of(0, 1)).isEmpty();
        long remaining = productRepository.countUncodedAfter(lastId);
        return AutoMatchResponse.builder()
                .proposals(proposals)
                .nextAfterId(done ? null : lastId)
                .remaining(remaining)
                .processed(batch.size())
                .build();
    }

    /** Applies reviewed matches. Skips products that vanished, blank codes, or codes already in use. */
    @Transactional
    public AutoMatchApplyResult applyBarcodeMatches(AutoMatchApplyRequest request) {
        if (request == null || request.getMatches() == null || request.getMatches().isEmpty()) {
            throw new BadRequestException("No matches to apply.");
        }
        int applied = 0;
        int skipped = 0;
        for (AutoMatchApplyRequest.Match match : request.getMatches()) {
            if (match == null || match.getProductId() == null) {
                skipped++;
                continue;
            }
            String code = blankToNull(match.getCode());
            if (code == null) {
                skipped++;
                continue;
            }
            Product product = productRepository.findById(match.getProductId()).orElse(null);
            if (product == null) {
                skipped++;
                continue;
            }
            Optional<Product> conflict = productRepository.findByBarcode(code);
            if (conflict.isPresent() && !conflict.get().getId().equals(product.getId())) {
                skipped++;
                continue;
            }
            product.setBarcode(code);
            productRepository.save(product);
            applied++;
        }
        return AutoMatchApplyResult.builder().applied(applied).skipped(skipped).build();
    }

    /** Best-scoring Open Food Facts candidate for a product name, if any clears the threshold. */
    private Optional<Candidate> bestCandidate(String productName) {
        String query = productName == null ? "" : productName.trim();
        if (query.isEmpty()) {
            return Optional.empty();
        }
        Candidate best = null;
        for (OpenFoodFactsService.OffSearchHit hit : openFoodFactsService.search(query, 8)) {
            String hitName = firstNonBlank(hit.productNameEn(), hit.productName(), hit.genericName());
            String code = blankToNull(hit.code());
            if (hitName == null || code == null) {
                continue;
            }
            int score = similarity(query, hitName);
            if (score < MIN_MATCH_SCORE || (best != null && score <= best.score())) {
                continue;
            }
            String brand = hit.brands() == null || hit.brands().isEmpty()
                    ? null
                    : blankToNull(hit.brands().get(0));
            best = new Candidate(code, hitName, brand, cleanQuantity(hit.quantity()),
                    blankToNull(hit.imageFrontSmallUrl()), score);
        }
        return Optional.ofNullable(best);
    }

    /** Token Dice-coefficient of two names, scaled to 0-100. */
    private int similarity(String a, String b) {
        Set<String> ta = tokens(a);
        Set<String> tb = tokens(b);
        if (ta.isEmpty() || tb.isEmpty()) {
            return 0;
        }
        int overlap = 0;
        for (String t : ta) {
            if (tb.contains(t)) {
                overlap++;
            }
        }
        return (int) Math.round(200.0 * overlap / (ta.size() + tb.size()));
    }

    private Set<String> tokens(String value) {
        Set<String> set = new HashSet<>();
        for (String t : value.toLowerCase().split("[^a-z0-9]+")) {
            if (t.length() >= 2) {
                set.add(t);
            }
        }
        return set;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            String trimmed = blankToNull(value);
            if (trimmed != null) {
                return trimmed;
            }
        }
        return null;
    }

    /** Strips the EU estimated-sign mark some pack sizes carry, e.g. "400 g e" -> "400 g". */
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

    /** Small pause between online searches so the free API is used politely. */
    private void sleepBriefly() {
        try {
            Thread.sleep(120);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
    }

    private record Candidate(String code, String name, String brand, String quantity, String imageUrl, int score) {
    }

    /** Rejects a till code that is already used by a different product. */
    private void ensureCodeFree(String code, Long id) {
        if (code == null) {
            return;
        }
        productRepository.findByCode(code).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new BadRequestException(
                        "Till code " + code + " is already used by \"" + existing.getName() + "\".");
            }
        });
    }

    /** Rejects a barcode that is already used by a different product. */
    private void ensureBarcodeFree(String barcode, Long id) {
        if (barcode == null) {
            return;
        }
        productRepository.findByBarcode(barcode).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new BadRequestException(
                        "Barcode " + barcode + " is already used by \"" + existing.getName() + "\".");
            }
        });
    }

    public ProductDto update(Long id, ProductRequest request) {
        Product product = getProduct(id);
        boolean wasLow = product.isLowStock();
        String code = blankToNull(request.getCode());
        String barcode = blankToNull(request.getBarcode());
        ensureCodeFree(code, id);
        ensureBarcodeFree(barcode, id);
        product.setName(request.getName());
        product.setCode(code);
        product.setBarcode(barcode);
        product.setDescription(request.getDescription());
        product.setBrand(request.getBrand());
        product.setRack(request.getRack());
        product.setPrice(request.getPrice());
        product.setCostPrice(request.getCostPrice());
        product.setExpiryDate(request.getExpiryDate());
        if (request.getStock() != null) {
            product.setStock(request.getStock());
        }
        if (request.getMinStock() != null) {
            product.setMinStock(request.getMinStock());
        }
        product.setImageUrl(request.getImageUrl());
        product.setCategory(resolveCategory(request.getCategoryId()));
        product.setSupplier(resolveSupplier(request.getSupplierId()));
        // Only change the shop when one was supplied, so partial updates keep it.
        if (request.getShop() != null && !request.getShop().isBlank()) {
            product.setShop(normalizeShop(request.getShop()));
        }
        Product saved = productRepository.save(product);
        notifyIfLow(saved, wasLow);
        return toDto(saved, Map.of(saved.getId(), soldFor(saved.getId())));
    }

    public ProductDto updateStock(Long id, Integer stock) {
        Product product = getProduct(id);
        boolean wasLow = product.isLowStock();
        product.setStock(stock != null ? stock : 0);
        Product saved = productRepository.save(product);
        notifyIfLow(saved, wasLow);
        return toDto(saved, Map.of(saved.getId(), soldFor(saved.getId())));
    }

    /** Sends owner + supplier low-stock alerts when a brand-new product starts at/below its minimum. */
    private void notifyIfLow(Product product) {
        if (product.isLowStock()) {
            whatsAppService.sendLowStockAlerts(List.of(product));
        }
    }

    /** Sends owner + supplier low-stock alerts only when stock actually dropped to/below the minimum. */
    private void notifyIfLow(Product product, boolean wasLow) {
        if (!wasLow && product.isLowStock()) {
            whatsAppService.sendLowStockAlerts(List.of(product));
        }
    }

    /** Adds the given quantity to the product's current stock (manual restock).
     *  When an expected delivery date is provided the goods are NOT yet in stock:
     *  a pending delivery is recorded and stock is added only when the admin
     *  confirms the delivery as received. */
    public ProductDto restock(Long id, RestockRequest request) {
        if (request == null || request.getQuantity() == null || request.getQuantity() <= 0) {
            throw new BadRequestException("Restock quantity must be at least 1.");
        }
        Product product = getProduct(id);
        if (request.getExpectedDelivery() != null) {
            restockHistoryService.createPending(product, request);
            return toDto(product, Map.of(product.getId(), soldFor(product.getId())));
        }
        product.setStock(product.getStock() + request.getQuantity());
        Product saved = productRepository.save(product);
        restockActivityService.recordActivity(saved.getId(), request.getQuantity(), false);
        restockHistoryService.recordManual(saved, request);
        return toDto(saved, Map.of(saved.getId(), soldFor(saved.getId())));
    }

    public void delete(Long id) {
        productRepository.delete(getProduct(id));
    }

    private Product getProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));
    }

    private Category resolveCategory(Long categoryId) {
        if (categoryId == null) {
            return null;
        }
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + categoryId));
    }

    private Supplier resolveSupplier(Long supplierId) {
        if (supplierId == null) {
            return null;
        }
        return supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found: " + supplierId));
    }

    private ProductDto toDto(Product product) {
        return toDto(product, Map.of(product.getId(), soldFor(product.getId())));
    }

    private ProductDto toDto(Product product, Map<Long, Long> sold) {
        ProductDto.ProductDtoBuilder builder = ProductDto.builder()
                .id(product.getId())
                .name(product.getName())
                .code(product.getCode())
                .barcode(product.getBarcode())
                .description(product.getDescription())
                .brand(product.getBrand())
                .rack(product.getRack())
                .price(product.getPrice())
                .costPrice(product.getCostPrice())
                .expiryDate(product.getExpiryDate())
                .stock(product.getStock())
                .minStock(product.getMinStock())
                .imageUrl(product.getImageUrl())
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .supplierId(product.getSupplier() != null ? product.getSupplier().getId() : null)
                .supplierName(product.getSupplier() != null ? product.getSupplier().getName() : null)
                .shop(product.getShop())
                .lowStock(product.isLowStock())
                .soldCount(sold.getOrDefault(product.getId(), 0L));

        RestockActivityService.Activity activity = restockActivityService.recentFor(product.getId());
        if (activity != null) {
            builder.restockQty(activity.quantity())
                    .restockAuto(activity.auto())
                    .restockAt(activity.at());
        }
        return builder.build();
    }

    /** Total units sold for one product (POS bills + customer orders, cancelled excluded). */
    private long soldFor(Long productId) {
        return orderItemRepository.sumSoldByProductId(productId)
                + billItemRepository.sumSoldByProductId(productId);
    }

    /** Combined sold totals per product from both sales sources, for efficient list mapping. */
    private Map<Long, Long> soldByProduct() {
        Map<Long, Long> map = new HashMap<>();
        for (Object[] row : orderItemRepository.sumSoldByProduct()) {
            map.merge(((Number) row[0]).longValue(), ((Number) row[1]).longValue(), Long::sum);
        }
        for (Object[] row : billItemRepository.sumSoldByProduct()) {
            map.merge(((Number) row[0]).longValue(), ((Number) row[1]).longValue(), Long::sum);
        }
        return map;
    }
}
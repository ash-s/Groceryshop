package com.groceryshop.product;

import com.groceryshop.billing.BillItemRepository;
import com.groceryshop.category.Category;
import com.groceryshop.category.CategoryRepository;
import com.groceryshop.dto.ProductDto;
import com.groceryshop.dto.ProductRequest;
import com.groceryshop.dto.RestockRequest;
import com.groceryshop.exception.BadRequestException;
import com.groceryshop.exception.ResourceNotFoundException;
import com.groceryshop.order.OrderItemRepository;
import com.groceryshop.restock.RestockHistoryService;
import com.groceryshop.supplier.Supplier;
import com.groceryshop.supplier.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

    public List<ProductDto> getAll(Long categoryId, String search) {
        List<Product> products;
        if (categoryId != null) {
            products = productRepository.findByCategoryId(categoryId);
        } else if (search != null && !search.isBlank()) {
            products = productRepository.search(search);
        } else {
            products = productRepository.findAll();
        }
        Map<Long, Long> sold = soldByProduct();
        return products.stream().map(product -> toDto(product, sold)).toList();
    }

    public ProductDto getById(Long id) {
        Product product = getProduct(id);
        return toDto(product, Map.of(product.getId(), soldFor(product.getId())));
    }

    public List<ProductDto> getLowStock() {
        Map<Long, Long> sold = soldByProduct();
        return productRepository.findLowStock().stream().map(product -> toDto(product, sold)).toList();
    }

    public ProductDto create(ProductRequest request) {
        Product product = Product.builder()
                .name(request.getName())
                .code(request.getCode())
                .description(request.getDescription())
                .price(request.getPrice())
                .stock(request.getStock() != null ? request.getStock() : 0)
                .minStock(request.getMinStock() != null ? request.getMinStock() : 10)
                .imageUrl(request.getImageUrl())
                .category(resolveCategory(request.getCategoryId()))
                .supplier(resolveSupplier(request.getSupplierId()))
                .createdAt(LocalDateTime.now())
                .build();
        Product saved = productRepository.save(product);
        return toDto(saved, Map.of(saved.getId(), soldFor(saved.getId())));
    }

    public ProductDto update(Long id, ProductRequest request) {
        Product product = getProduct(id);
        product.setName(request.getName());
        product.setCode(request.getCode());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        if (request.getStock() != null) {
            product.setStock(request.getStock());
        }
        if (request.getMinStock() != null) {
            product.setMinStock(request.getMinStock());
        }
        product.setImageUrl(request.getImageUrl());
        product.setCategory(resolveCategory(request.getCategoryId()));
        product.setSupplier(resolveSupplier(request.getSupplierId()));
        Product saved = productRepository.save(product);
        return toDto(saved, Map.of(saved.getId(), soldFor(saved.getId())));
    }

    public ProductDto updateStock(Long id, Integer stock) {
        Product product = getProduct(id);
        product.setStock(stock != null ? stock : 0);
        Product saved = productRepository.save(product);
        return toDto(saved, Map.of(saved.getId(), soldFor(saved.getId())));
    }

    /** Adds the given quantity to the product's current stock (manual restock). */
    public ProductDto restock(Long id, RestockRequest request) {
        if (request == null || request.getQuantity() == null || request.getQuantity() <= 0) {
            throw new BadRequestException("Restock quantity must be at least 1.");
        }
        Product product = getProduct(id);
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
                .description(product.getDescription())
                .price(product.getPrice())
                .stock(product.getStock())
                .minStock(product.getMinStock())
                .imageUrl(product.getImageUrl())
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .supplierId(product.getSupplier() != null ? product.getSupplier().getId() : null)
                .supplierName(product.getSupplier() != null ? product.getSupplier().getName() : null)
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
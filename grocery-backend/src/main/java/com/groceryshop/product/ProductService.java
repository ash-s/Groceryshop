package com.groceryshop.product;

import com.groceryshop.category.Category;
import com.groceryshop.category.CategoryRepository;
import com.groceryshop.dto.ProductDto;
import com.groceryshop.dto.ProductRequest;
import com.groceryshop.exception.ResourceNotFoundException;
import com.groceryshop.supplier.Supplier;
import com.groceryshop.supplier.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final SupplierRepository supplierRepository;

    public List<ProductDto> getAll(Long categoryId, String search) {
        List<Product> products;
        if (categoryId != null) {
            products = productRepository.findByCategoryId(categoryId);
        } else if (search != null && !search.isBlank()) {
            products = productRepository.search(search);
        } else {
            products = productRepository.findAll();
        }
        return products.stream().map(this::toDto).toList();
    }

    public ProductDto getById(Long id) {
        return toDto(getProduct(id));
    }

    public List<ProductDto> getLowStock() {
        return productRepository.findLowStock().stream().map(this::toDto).toList();
    }

    public ProductDto create(ProductRequest request) {
        Product product = Product.builder()
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .stock(request.getStock() != null ? request.getStock() : 0)
                .minStock(request.getMinStock() != null ? request.getMinStock() : 10)
                .imageUrl(request.getImageUrl())
                .category(resolveCategory(request.getCategoryId()))
                .supplier(resolveSupplier(request.getSupplierId()))
                .createdAt(LocalDateTime.now())
                .build();
        return toDto(productRepository.save(product));
    }

    public ProductDto update(Long id, ProductRequest request) {
        Product product = getProduct(id);
        product.setName(request.getName());
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
        return toDto(productRepository.save(product));
    }

    public ProductDto updateStock(Long id, Integer stock) {
        Product product = getProduct(id);
        product.setStock(stock != null ? stock : 0);
        return toDto(productRepository.save(product));
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
        return ProductDto.builder()
                .id(product.getId())
                .name(product.getName())
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
                .build();
    }
}
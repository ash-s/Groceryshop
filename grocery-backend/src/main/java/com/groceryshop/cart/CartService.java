package com.groceryshop.cart;

import com.groceryshop.dto.CartItemDto;
import com.groceryshop.dto.CartRequest;
import com.groceryshop.dto.CartResponse;
import com.groceryshop.exception.BadRequestException;
import com.groceryshop.exception.ResourceNotFoundException;
import com.groceryshop.product.Product;
import com.groceryshop.product.ProductRepository;
import com.groceryshop.user.User;
import com.groceryshop.util.CurrentUserUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final CurrentUserUtil currentUserUtil;

    @Transactional
    public CartItemDto addToCart(CartRequest request) {
        User user = currentUserUtil.getCurrentUser();
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + request.getProductId()));

        CartItem item = cartItemRepository.findByUserIdAndProductId(user.getId(), product.getId())
                .orElseGet(() -> CartItem.builder()
                        .user(user)
                        .product(product)
                        .quantity(0)
                        .createdAt(LocalDateTime.now())
                        .build());

        int newQuantity = item.getQuantity() + request.getQuantity();
        if (newQuantity > product.getStock()) {
            throw new BadRequestException("Not enough stock available for " + product.getName());
        }
        item.setQuantity(newQuantity);
        return toItemDto(cartItemRepository.save(item));
    }

    @Transactional
    public CartItemDto updateQuantity(Long itemId, int quantity) {
        if (quantity < 1) {
            throw new BadRequestException("Quantity must be at least 1");
        }
        CartItem item = getOwnedItem(itemId);
        if (quantity > item.getProduct().getStock()) {
            throw new BadRequestException("Not enough stock available for " + item.getProduct().getName());
        }
        item.setQuantity(quantity);
        return toItemDto(cartItemRepository.save(item));
    }

    @Transactional
    public void removeItem(Long itemId) {
        cartItemRepository.delete(getOwnedItem(itemId));
    }

    @Transactional
    public void clearCart() {
        User user = currentUserUtil.getCurrentUser();
        cartItemRepository.deleteByUserId(user.getId());
    }

    @Transactional(readOnly = true)
    public CartResponse getCart() {
        User user = currentUserUtil.getCurrentUser();
        List<CartItem> items = cartItemRepository.findByUserId(user.getId());
        List<CartItemDto> itemDtos = items.stream().map(this::toItemDto).toList();

        int totalItems = itemDtos.stream().mapToInt(CartItemDto::getQuantity).sum();
        BigDecimal subtotal = itemDtos.stream()
                .map(CartItemDto::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return CartResponse.builder()
                .items(itemDtos)
                .totalItems(totalItems)
                .subtotal(subtotal)
                .build();
    }

    private CartItem getOwnedItem(Long itemId) {
        User user = currentUserUtil.getCurrentUser();
        CartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found: " + itemId));
        if (!item.getUser().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("Cart item not found: " + itemId);
        }
        return item;
    }

    private CartItemDto toItemDto(CartItem item) {
        Product product = item.getProduct();
        BigDecimal subtotal = product.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
        return CartItemDto.builder()
                .id(item.getId())
                .productId(product.getId())
                .productName(product.getName())
                .imageUrl(product.getImageUrl())
                .price(product.getPrice())
                .quantity(item.getQuantity())
                .subtotal(subtotal)
                .stock(product.getStock())
                .build();
    }
}
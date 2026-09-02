package com.groceryshop.order;

import com.groceryshop.cart.CartItem;
import com.groceryshop.cart.CartItemRepository;
import com.groceryshop.dto.OrderDto;
import com.groceryshop.dto.OrderItemDto;
import com.groceryshop.dto.OrderRequest;
import com.groceryshop.exception.BadRequestException;
import com.groceryshop.exception.ResourceNotFoundException;
import com.groceryshop.product.Product;
import com.groceryshop.product.ProductRepository;
import com.groceryshop.user.User;
import com.groceryshop.util.CurrentUserUtil;
import com.groceryshop.whatsapp.WhatsAppService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final DateTimeFormatter ORDER_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final OrderRepository orderRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final CurrentUserUtil currentUserUtil;
    private final WhatsAppService whatsAppService;

    @Transactional
    public OrderDto placeOrder(OrderRequest request) {
        User user = currentUserUtil.getCurrentUser();
        List<CartItem> cartItems = cartItemRepository.findByUserId(user.getId());

        if (cartItems.isEmpty()) {
            throw new BadRequestException("Your cart is empty");
        }

        Order order = Order.builder()
                .orderNumber(generateOrderNumber())
                .user(user)
                .status(OrderStatus.PENDING)
                .deliveryAddress(request.getDeliveryAddress())
                .paymentMethod(request.getPaymentMethod())
                .createdAt(LocalDateTime.now())
                .build();

        BigDecimal total = BigDecimal.ZERO;
        List<Product> affectedProducts = new ArrayList<>();

        for (CartItem cartItem : cartItems) {
            Product product = cartItem.getProduct();
            if (cartItem.getQuantity() > product.getStock()) {
                throw new BadRequestException("Not enough stock available for " + product.getName());
            }

            OrderItem orderItem = OrderItem.builder()
                    .product(product)
                    .productName(product.getName())
                    .quantity(cartItem.getQuantity())
                    .price(product.getPrice())
                    .build();
            order.addItem(orderItem);

            BigDecimal lineTotal = product.getPrice().multiply(BigDecimal.valueOf(cartItem.getQuantity()));
            total = total.add(lineTotal);

            product.setStock(product.getStock() - cartItem.getQuantity());
            affectedProducts.add(product);
        }

        order.setTotal(total);
        orderRepository.save(order);
        productRepository.saveAll(affectedProducts);
        cartItemRepository.deleteByUserId(user.getId());

        List<Product> lowStock = affectedProducts.stream().filter(Product::isLowStock).toList();
        if (!lowStock.isEmpty()) {
            whatsAppService.sendLowStockAlerts(lowStock);
        }

        return toDto(order);
    }

    public List<OrderDto> getMyOrders() {
        User user = currentUserUtil.getCurrentUser();
        return orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream().map(this::toDto).toList();
    }

    public OrderDto getOrderById(Long id) {
        User user = currentUserUtil.getCurrentUser();
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + id));
        if (!order.getUser().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("Order not found: " + id);
        }
        return toDto(order);
    }

    public List<OrderDto> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toDto).toList();
    }

    @Transactional
    public OrderDto updateStatus(Long id, OrderStatus status) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + id));
        order.setStatus(status);
        return toDto(orderRepository.save(order));
    }

    public boolean hasOutOfStock(List<CartItem> cartItems) {
        return cartItems.stream().anyMatch(item -> item.getQuantity() > item.getProduct().getStock());
    }

    private String generateOrderNumber() {
        return "GS" + LocalDateTime.now().format(ORDER_DATE_FORMAT);
    }

    private OrderDto toDto(Order order) {
        List<OrderItemDto> itemDtos = order.getItems().stream().map(item ->
                OrderItemDto.builder()
                        .productId(item.getProduct() != null ? item.getProduct().getId() : null)
                        .productName(item.getProductName())
                        .quantity(item.getQuantity())
                        .price(item.getPrice())
                        .subtotal(item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                        .build()
        ).toList();

        return OrderDto.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .userId(order.getUser().getId())
                .customerName(order.getUser().getFullName())
                .total(order.getTotal())
                .status(order.getStatus())
                .deliveryAddress(order.getDeliveryAddress())
                .paymentMethod(order.getPaymentMethod())
                .createdAt(order.getCreatedAt())
                .items(itemDtos)
                .build();
    }
}
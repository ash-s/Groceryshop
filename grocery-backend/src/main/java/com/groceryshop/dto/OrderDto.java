package com.groceryshop.dto;

import com.groceryshop.order.OrderStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class OrderDto {

    private Long id;
    private String orderNumber;
    private Long userId;
    private String customerName;
    private BigDecimal total;
    private OrderStatus status;
    private String deliveryAddress;
    private String paymentMethod;
    private LocalDateTime createdAt;
    private List<OrderItemDto> items;
}
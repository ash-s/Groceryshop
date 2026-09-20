package com.groceryshop.restock;

import com.groceryshop.dto.RestockEventDto;
import com.groceryshop.dto.RestockRequest;
import com.groceryshop.exception.BadRequestException;
import com.groceryshop.product.Product;
import com.groceryshop.util.CurrentUserUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RestockHistoryService {

    public static final List<String> DELIVERY_METHODS = List.of("SUPPLIER", "COURIER", "SELF_PICKUP", "OTHER");

    private final RestockEventRepository restockEventRepository;
    private final CurrentUserUtil currentUserUtil;

    /** Records an automatic sale-time top-up (no delivery involved). */
    public void recordAuto(Product product, int quantity, LocalDateTime at, String soldBy) {
        save(product, quantity, "AUTO", null, at, null,
                "Auto-restocked after the sale dropped stock to its minimum level.", soldBy, at);
    }

    /** Records a manual restock / received delivery made by an admin. */
    public void recordManual(Product product, RestockRequest request) {
        String method = request.getDeliveryMethod();
        if (method != null && !method.isBlank() && !DELIVERY_METHODS.contains(method)) {
            throw new BadRequestException("Unknown delivery method: " + method
                    + ". Use SUPPLIER, COURIER, SELF_PICKUP or OTHER.");
        }
        String createdBy = currentUserUtil.getCurrentUser().getUsername();
        LocalDateTime receivedAt = request.getReceivedAt() != null ? request.getReceivedAt() : LocalDateTime.now();
        save(product, request.getQuantity(), "MANUAL", normalize(method), receivedAt,
                request.getCostPerUnit(), request.getNotes(), createdBy, LocalDateTime.now());
    }

    private void save(Product product, int quantity, String type, String method, LocalDateTime receivedAt,
                      java.math.BigDecimal costPerUnit, String notes, String createdBy, LocalDateTime createdAt) {
        RestockEvent event = RestockEvent.builder()
                .product(product)
                .quantity(quantity)
                .eventType(type)
                .deliveryMethod(normalize(method))
                .receivedAt(receivedAt)
                .costPerUnit(costPerUnit)
                .notes(notes != null && !notes.isBlank() ? notes.trim() : null)
                .createdBy(createdBy)
                .createdAt(createdAt)
                .build();
        restockEventRepository.save(event);
    }

    public List<RestockEventDto> getAll() {
        return restockEventRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toDto).toList();
    }

    private String normalize(String value) {
        return value != null && !value.isBlank() ? value.trim().toUpperCase() : null;
    }

    private RestockEventDto toDto(RestockEvent event) {
        Product product = event.getProduct();
        return RestockEventDto.builder()
                .id(event.getId())
                .productId(product != null ? product.getId() : null)
                .productName(product != null ? product.getName() : null)
                .productCode(product != null ? product.getCode() : null)
                .quantity(event.getQuantity())
                .eventType(event.getEventType())
                .deliveryMethod(event.getDeliveryMethod())
                .receivedAt(event.getReceivedAt())
                .costPerUnit(event.getCostPerUnit())
                .notes(event.getNotes())
                .createdBy(event.getCreatedBy())
                .createdAt(event.getCreatedAt())
                .build();
    }
}
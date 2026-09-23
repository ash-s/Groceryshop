package com.groceryshop.restock;

import com.groceryshop.dto.RestockEventDto;
import com.groceryshop.dto.RestockRequest;
import com.groceryshop.exception.BadRequestException;
import com.groceryshop.exception.ResourceNotFoundException;
import com.groceryshop.product.Product;
import com.groceryshop.product.ProductRepository;
import com.groceryshop.product.RestockActivityService;
import com.groceryshop.util.CurrentUserUtil;
import com.groceryshop.whatsapp.WhatsAppService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RestockHistoryService {

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_DELIVERED = "DELIVERED";
    public static final List<String> DELIVERY_METHODS = List.of("SUPPLIER", "COURIER", "SELF_PICKUP", "OTHER");

    private final RestockEventRepository restockEventRepository;
    private final ProductRepository productRepository;
    private final RestockActivityService restockActivityService;
    private final CurrentUserUtil currentUserUtil;
    private final WhatsAppService whatsAppService;

    /** Records an automatic sale-time top-up (no delivery involved). */
    public void recordAuto(Product product, int quantity, LocalDateTime at, String soldBy) {
        save(product, quantity, "AUTO", null, at, null,
                "Auto-restocked after the sale dropped stock to its minimum level.", soldBy, at);
    }

    /** Records a manual restock of goods already received (stock was added immediately). */
    public void recordManual(Product product, RestockRequest request) {
        String method = normalizeDeliveryMethod(request.getDeliveryMethod());
        String createdBy = currentUserUtil.getCurrentUser().getUsername();
        LocalDateTime receivedAt = request.getReceivedAt() != null ? request.getReceivedAt() : LocalDateTime.now();
        save(product, request.getQuantity(), "MANUAL", method, receivedAt,
                request.getCostPerUnit(), request.getNotes(), createdBy, LocalDateTime.now());
    }

    /**
     * Records a pending purchase order. The goods arrive on an expected delivery
     * date, so stock is NOT increased until the admin confirms the delivery.
     */
    public void createPending(Product product, RestockRequest request) {
        if (request.getExpectedDelivery() == null) {
            throw new BadRequestException("Expected delivery date is required for a pending restock.");
        }
        String method = normalizeDeliveryMethod(request.getDeliveryMethod());
        String createdBy = currentUserUtil.getCurrentUser().getUsername();
        RestockEvent event = RestockEvent.builder()
                .product(product)
                .quantity(request.getQuantity())
                .eventType("MANUAL")
                .deliveryMethod(method)
                .receivedAt(null)
                .expectedDelivery(request.getExpectedDelivery())
                .status(STATUS_PENDING)
                .costPerUnit(request.getCostPerUnit())
                .notes(trimToNull(request.getNotes()))
                .createdBy(createdBy)
                .createdAt(LocalDateTime.now())
                .build();
        restockEventRepository.save(event);
    }

    /**
     * Confirms a pending delivery as received and adds the ordered quantity to the
     * product's stock (this is the moment the goods enter the inventory).
     */
    @Transactional
    public RestockEventDto markDelivered(Long eventId, LocalDate receivedDate) {
        RestockEvent event = restockEventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Restock event not found: " + eventId));
        if (!STATUS_PENDING.equals(event.getStatus())) {
            throw new BadRequestException("This restock is not pending delivery.");
        }
        Product product = event.getProduct();
        product.setStock(product.getStock() + event.getQuantity());
        productRepository.save(product);

        LocalDateTime now = LocalDateTime.now();
        event.setStatus(STATUS_DELIVERED);
        event.setDeliveredAt(now);
        event.setReceivedAt(receivedDate != null ? receivedDate.atStartOfDay() : now);
        event.setAlertSentOn(null);
        restockEventRepository.save(event);

        restockActivityService.recordActivity(product.getId(), event.getQuantity(), false);
        return toDto(event);
    }

    /** All pending deliveries awaiting confirmation, soonest expected date first. */
    public List<RestockEventDto> getPending() {
        return restockEventRepository.findByStatusOrderByExpectedDeliveryAsc(STATUS_PENDING)
                .stream().map(this::toDto).toList();
    }

    /**
     * Daily reminder for deliveries that are due or overdue. Sends one WhatsApp
     * message per pending event per day (owner number), marks the day as alerted,
     * and returns how many reminders were sent.
     */
    @Transactional
    public int sendDueDeliveryReminders() {
        LocalDate today = LocalDate.now();
        List<RestockEvent> due = restockEventRepository
                .findByStatusAndExpectedDeliveryLessThanEqual(STATUS_PENDING, today);
        int sent = 0;
        for (RestockEvent event : due) {
            if (event.getAlertSentOn() != null && !event.getAlertSentOn().isBefore(today)) {
                continue; // already reminded today
            }
            Product product = event.getProduct();
            String supplier = product.getSupplier() != null ? product.getSupplier().getName() : "N/A";
            whatsAppService.sendDeliveryReminder(
                    product.getName(),
                    product.getCode(),
                    event.getQuantity(),
                    event.getExpectedDelivery(),
                    event.getDeliveryMethod(),
                    supplier,
                    product.getMinStock());
            event.setAlertSentOn(today);
            restockEventRepository.save(event);
            sent++;
        }
        return sent;
    }

    public List<RestockEventDto> getAll() {
        return restockEventRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toDto).toList();
    }

    private void save(Product product, int quantity, String type, String method, LocalDateTime receivedAt,
                      java.math.BigDecimal costPerUnit, String notes, String createdBy, LocalDateTime createdAt) {
        RestockEvent event = RestockEvent.builder()
                .product(product)
                .quantity(quantity)
                .eventType(type)
                .deliveryMethod(normalize(method))
                .receivedAt(receivedAt)
                .status(STATUS_DELIVERED)
                .costPerUnit(costPerUnit)
                .notes(notes != null && !notes.isBlank() ? notes.trim() : null)
                .createdBy(createdBy)
                .createdAt(createdAt)
                .build();
        restockEventRepository.save(event);
    }

    private String normalizeDeliveryMethod(String method) {
        if (method != null && !method.isBlank() && !DELIVERY_METHODS.contains(method.trim().toUpperCase())) {
            throw new BadRequestException("Unknown delivery method: " + method
                    + ". Use SUPPLIER, COURIER, SELF_PICKUP or OTHER.");
        }
        return normalize(method);
    }

    private String normalize(String value) {
        return value != null && !value.isBlank() ? value.trim().toUpperCase() : null;
    }

    private static String trimToNull(String value) {
        return value != null && !value.isBlank() ? value.trim() : null;
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
                .expectedDelivery(event.getExpectedDelivery())
                .status(event.getStatus())
                .deliveredAt(event.getDeliveredAt())
                .costPerUnit(event.getCostPerUnit())
                .notes(event.getNotes())
                .createdBy(event.getCreatedBy())
                .createdAt(event.getCreatedAt())
                .build();
    }
}
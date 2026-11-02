package com.groceryshop.customer;

import com.groceryshop.dto.BroadcastRequest;
import com.groceryshop.dto.BroadcastResult;
import com.groceryshop.dto.CustomerDto;
import com.groceryshop.dto.CustomerRequest;
import com.groceryshop.dto.PointEntryDto;
import com.groceryshop.dto.PointsAdjustRequest;
import com.groceryshop.exception.BadRequestException;
import com.groceryshop.exception.ResourceNotFoundException;
import com.groceryshop.settings.LoyaltySettingsService;
import com.groceryshop.whatsapp.WhatsAppService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Customer records, the loyalty point ledger and offer broadcasts.
 */
@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final PointEntryRepository pointEntryRepository;
    private final LoyaltySettingsService loyaltySettingsService;
    private final WhatsAppService whatsAppService;
    private final com.groceryshop.billing.BillRepository billRepository;

    @Transactional(readOnly = true)
    public List<CustomerDto> list(String search) {
        List<Customer> customers;
        if (search == null || search.isBlank()) {
            customers = customerRepository.findAllByOrderByNameAsc();
        } else {
            String term = search.trim();
            customers = customerRepository
                    .findByNameContainingIgnoreCaseOrPhoneContainingOrderByNameAsc(term, term);
        }
        return customers.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public CustomerDto get(Long id) {
        return toDto(find(id));
    }

    @Transactional
    public CustomerDto create(CustomerRequest request) {
        Customer customer = Customer.builder()
                .name(request.getName().trim())
                .phone(normalizePhone(request.getPhone()))
                .points(0)
                .notes(request.getNotes())
                .createdAt(LocalDateTime.now())
                .build();
        return toDto(customerRepository.save(customer));
    }

    @Transactional
    public CustomerDto update(Long id, CustomerRequest request) {
        Customer customer = find(id);
        customer.setName(request.getName().trim());
        customer.setPhone(normalizePhone(request.getPhone()));
        customer.setNotes(request.getNotes());
        return toDto(customerRepository.save(customer));
    }

    @Transactional
    public void delete(Long id) {
        Customer customer = find(id);
        if (billRepository.existsByCustomerId(id)) {
            throw new BadRequestException(
                    "This customer has bills and cannot be deleted. Clear their points instead.");
        }
        pointEntryRepository.deleteAll(pointEntryRepository.findByCustomerIdOrderByCreatedAtDesc(id));
        customerRepository.delete(customer);
    }

    @Transactional
    public CustomerDto adjustPoints(Long id, PointsAdjustRequest request) {
        Customer customer = find(id);
        int delta = request.getPoints();
        if (delta == 0) {
            throw new BadRequestException("Enter a non-zero points change");
        }
        int newBalance = customer.getPoints() + delta;
        if (newBalance < 0) {
            throw new BadRequestException("Customer only has " + customer.getPoints() + " points");
        }
        String reason = request.getReason() != null && !request.getReason().isBlank()
                ? request.getReason().trim()
                : (delta > 0 ? "Manual credit" : "Manual debit");
        customer.setPoints(newBalance);
        customerRepository.save(customer);
        recordPoints(customer.getId(), null, delta, reason);
        return toDto(customer);
    }

    @Transactional(readOnly = true)
    public List<PointEntryDto> points(Long id) {
        find(id);
        return pointEntryRepository.findByCustomerIdOrderByCreatedAtDesc(id).stream()
                .map(entry -> PointEntryDto.builder()
                        .id(entry.getId())
                        .points(entry.getPoints())
                        .reason(entry.getReason())
                        .billId(entry.getBillId())
                        .createdAt(entry.getCreatedAt())
                        .build())
                .toList();
    }

    /** Sends an offer / price-change message to the selected customers. */
    public BroadcastResult broadcast(BroadcastRequest request) {
        List<Customer> targets = new ArrayList<>();
        if (request.isAll()) {
            targets.addAll(customerRepository.findAllByOrderByNameAsc());
        } else if (request.getCustomerIds() != null) {
            for (Long id : request.getCustomerIds()) {
                customerRepository.findById(id).ifPresent(targets::add);
            }
        }

        int sent = 0;
        int skipped = 0;
        int failed = 0;
        for (Customer customer : targets) {
            if (customer.getPhone() == null || customer.getPhone().isBlank()) {
                skipped++;
                continue;
            }
            if (whatsAppService.sendCustomerMessage(customer.getPhone(), customer.getName(), request.getMessage())) {
                sent++;
            } else {
                failed++;
            }
        }
        return BroadcastResult.builder().sent(sent).skipped(skipped).failed(failed).build();
    }

    /**
     * Resolves the customer for a bill: by id when given, else by phone (reusing
     * an existing record), else creates a new one from the typed name. Returns null
     * when there is nothing to link.
     */
    @Transactional
    public Customer resolveForBill(Long customerId, String phone, String name) {
        String normalized = normalizePhone(phone);
        if (customerId != null) {
            return find(customerId);
        }
        if (normalized != null) {
            Customer existing = customerRepository.findFirstByPhone(normalized).orElse(null);
            if (existing != null) {
                return existing;
            }
        }
        String cleanName = name != null && !name.isBlank() ? name.trim() : null;
        if (normalized == null && cleanName == null) {
            return null;
        }
        Customer customer = Customer.builder()
                .name(cleanName != null ? cleanName : normalized)
                .phone(normalized)
                .points(0)
                .createdAt(LocalDateTime.now())
                .build();
        return customerRepository.save(customer);
    }

    /**
     * Applies a bill's loyalty movement: removes redeemed points, adds earned
     * points and records both in the ledger.
     */
    @Transactional
    public void applyBillPoints(Customer customer, Long billId, int redeemed, int earned) {
        int balance = customer.getPoints() != null ? customer.getPoints() : 0;
        customer.setPoints(balance - redeemed + earned);
        customerRepository.save(customer);
        if (redeemed > 0) {
            recordPoints(customer.getId(), billId, -redeemed, "Redeemed on bill");
        }
        if (earned > 0) {
            recordPoints(customer.getId(), billId, earned, "Earned on bill");
        }
    }

    /** Adds (positive) or removes (negative) points and records the movement. */
    @Transactional
    public void recordPoints(Long customerId, Long billId, int points, String reason) {        if (points == 0) {
            return;
        }
        pointEntryRepository.save(PointEntry.builder()
                .customerId(customerId)
                .billId(billId)
                .points(points)
                .reason(reason)
                .createdAt(LocalDateTime.now())
                .build());
    }

    private Customer find(Long id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + id));
    }

    private static String normalizePhone(String phone) {
        if (phone == null) {
            return null;
        }
        String trimmed = phone.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private CustomerDto toDto(Customer customer) {
        int points = customer.getPoints() != null ? customer.getPoints() : 0;
        BigDecimal value = BigDecimal.valueOf((long) points * loyaltySettingsService.getPointValue());
        return CustomerDto.builder()
                .id(customer.getId())
                .name(customer.getName())
                .phone(customer.getPhone())
                .points(points)
                .pointsValue(value)
                .notes(customer.getNotes())
                .build();
    }
}

package com.groceryshop.billing;

import com.groceryshop.dto.BillDto;
import com.groceryshop.dto.BillItemDto;
import com.groceryshop.dto.CreateBillRequest;
import com.groceryshop.dto.DailySalesDto;
import com.groceryshop.dto.SalesReportDto;
import com.groceryshop.exception.BadRequestException;
import com.groceryshop.exception.ResourceNotFoundException;
import com.groceryshop.product.Product;
import com.groceryshop.product.ProductRepository;
import com.groceryshop.product.RestockActivityService;
import com.groceryshop.restock.RestockHistoryService;
import com.groceryshop.settings.StockSettingsService;
import com.groceryshop.user.User;
import com.groceryshop.util.CurrentUserUtil;
import com.groceryshop.whatsapp.WhatsAppService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
public class BillService {

    private static final DateTimeFormatter BILL_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final DateTimeFormatter DAY_LABEL = DateTimeFormatter.ofPattern("EEE", Locale.ENGLISH);

    private final BillRepository billRepository;
    private final ProductRepository productRepository;
    private final CurrentUserUtil currentUserUtil;
    private final WhatsAppService whatsAppService;
    private final RestockActivityService restockActivityService;
    private final RestockHistoryService restockHistoryService;
    private final StockSettingsService stockSettingsService;

    /**
     * Creates a point-of-sale bill for a walk-in customer and reduces product stock
     * (stock-out flow). Staff-only action.
     */
    @Transactional
    public BillDto createBill(CreateBillRequest request) {
        User staff = currentUserUtil.getCurrentUser();

        Bill bill = Bill.builder()
                .billNumber("BILL" + LocalDateTime.now().format(BILL_DATE_FORMAT))
                .staff(staff)
                .customerName(request.getCustomerName())
                .paymentMethod(request.getPaymentMethod())
                .createdAt(LocalDateTime.now())
                .build();

        BigDecimal total = BigDecimal.ZERO;
        List<Product> affectedProducts = new ArrayList<>();
        // Products that dipped to (or below) their min stock during this sale.
        Map<Long, Product> hitLimit = new LinkedHashMap<>();
        // Auto-restocked quantity per product id (same number as sold, restoring pre-sale stock).
        Map<Long, Integer> autoRestocked = new HashMap<>();
        // Auto-restock can be switched off: then the sale just leaves stock low and alerts.
        boolean autoRestock = stockSettingsService.isAutoRestockEnabled();

        for (CreateBillRequest.BillItemRequest item : request.getItems()) {
            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + item.getProductId()));

            if (item.getQuantity() > product.getStock()) {
                throw new BadRequestException("Not enough stock for " + product.getName()
                        + " (available: " + product.getStock() + ")");
            }

            BigDecimal lineTotal = product.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
            BillItem billItem = BillItem.builder()
                    .product(product)
                    .productName(product.getName())
                    .quantity(item.getQuantity())
                    .price(product.getPrice())
                    .subtotal(lineTotal)
                    .build();
            bill.addItem(billItem);

            total = total.add(lineTotal);
            product.setStock(product.getStock() - item.getQuantity());
            affectedProducts.add(product);

            // When a sale brings stock to (or below) the minimum: with auto-restock
            // on, put back the same quantity that was just sold so stock returns to
            // the level before this purchase. Either way, alert admin + supplier.
            if (product.getStock() <= product.getMinStock()) {
                hitLimit.putIfAbsent(product.getId(), product);
                if (autoRestock) {
                    product.setStock(product.getStock() + item.getQuantity());
                    autoRestocked.merge(product.getId(), item.getQuantity(), Integer::sum);
                }
            }
        }

        bill.setTotal(total);
        billRepository.save(bill);
        productRepository.saveAll(affectedProducts);

        if (!hitLimit.isEmpty()) {
            LocalDateTime now = LocalDateTime.now();
            // Remember what was auto-restocked so the admin UI can highlight it,
            // and persist it to the restock history (type AUTO, no delivery involved).
            autoRestocked.forEach((productId, qty) -> {
                Product product = hitLimit.get(productId);
                if (product != null) {
                    restockActivityService.recordActivity(productId, qty, true);
                    restockHistoryService.recordAuto(product, qty, now, staff.getUsername());
                }
            });
            whatsAppService.sendLowStockAlerts(new ArrayList<>(hitLimit.values()), autoRestocked);
        }

        return toDto(bill);
    }

    public List<BillDto> getAllBills() {
        return billRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toDto).toList();
    }

    /** Last 7 days, one entry per day (Mon..Sun labels), including today. */
    public SalesReportDto getWeeklyReport() {
        LocalDate today = LocalDate.now();
        return buildReport(today.minusDays(6), today, date -> date.format(DAY_LABEL));
    }

    /** Current calendar month, one entry per day (day-of-month labels). */
    public SalesReportDto getMonthlyReport() {
        LocalDate today = LocalDate.now();
        return buildReport(today.withDayOfMonth(1), today, date -> String.valueOf(date.getDayOfMonth()));
    }

    private SalesReportDto buildReport(LocalDate start, LocalDate end, Function<LocalDate, String> labelFn) {
        Map<LocalDate, BigDecimal> totals = new HashMap<>();
        Map<LocalDate, Long> counts = new HashMap<>();
        long itemsSold = 0;

        for (Bill bill : billRepository.findAllByOrderByCreatedAtDesc()) {
            LocalDate day = bill.getCreatedAt().toLocalDate();
            if (day.isBefore(start) || day.isAfter(end)) {
                continue;
            }
            totals.merge(day, bill.getTotal(), BigDecimal::add);
            counts.merge(day, 1L, Long::sum);
            if (bill.getItems() != null) {
                itemsSold += bill.getItems().stream().mapToLong(BillItem::getQuantity).sum();
            }
        }

        List<DailySalesDto> daily = new ArrayList<>();
        BigDecimal totalSales = BigDecimal.ZERO;
        long billCount = 0;

        for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
            BigDecimal dayTotal = totals.getOrDefault(day, BigDecimal.ZERO);
            long dayCount = counts.getOrDefault(day, 0L);
            totalSales = totalSales.add(dayTotal);
            billCount += dayCount;
            daily.add(DailySalesDto.builder()
                    .date(day.toString())
                    .label(labelFn.apply(day))
                    .total(dayTotal)
                    .billCount(dayCount)
                    .build());
        }

        return SalesReportDto.builder()
                .daily(daily)
                .totalSales(totalSales)
                .billCount(billCount)
                .itemsSold(itemsSold)
                .build();
    }

    private BillDto toDto(Bill bill) {
        List<BillItemDto> itemDtos = bill.getItems().stream().map(item ->
                BillItemDto.builder()
                        .productId(item.getProduct() != null ? item.getProduct().getId() : null)
                        .productName(item.getProductName())
                        .quantity(item.getQuantity())
                        .price(item.getPrice())
                        .subtotal(item.getSubtotal())
                        .build()
        ).toList();

        return BillDto.builder()
                .id(bill.getId())
                .billNumber(bill.getBillNumber())
                .staffName(bill.getStaff().getFullName())
                .customerName(bill.getCustomerName())
                .total(bill.getTotal())
                .paymentMethod(bill.getPaymentMethod())
                .createdAt(bill.getCreatedAt())
                .items(itemDtos)
                .build();
    }
}
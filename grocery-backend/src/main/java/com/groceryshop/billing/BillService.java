package com.groceryshop.billing;

import com.groceryshop.bridge.BridgeService;
import com.groceryshop.customer.Customer;
import com.groceryshop.customer.CustomerService;
import com.groceryshop.dto.BillDto;
import com.groceryshop.dto.BillItemDto;
import com.groceryshop.dto.CreateBillRequest;
import com.groceryshop.dto.DailySalesDto;
import com.groceryshop.dto.SalesReportDto;
import com.groceryshop.exception.BadRequestException;
import com.groceryshop.exception.ResourceNotFoundException;
import com.groceryshop.product.Product;
import com.groceryshop.product.ProductRepository;
import com.groceryshop.product.ProductService;
import com.groceryshop.product.RestockActivityService;
import com.groceryshop.restock.RestockHistoryService;
import com.groceryshop.settings.LoyaltySettingsService;
import com.groceryshop.settings.StockSettingsService;
import com.groceryshop.user.User;
import com.groceryshop.util.CurrentUserUtil;
import com.groceryshop.whatsapp.WhatsAppService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
    private final CustomerService customerService;
    private final LoyaltySettingsService loyaltySettingsService;
    private final BridgeService bridgeService;

    /**
     * Creates a point-of-sale bill for a walk-in customer and reduces product stock
     * (stock-out flow). Staff-only action.
     */
    @Transactional
    public BillDto createBill(CreateBillRequest request) {
        User staff = currentUserUtil.getCurrentUser();

        BigDecimal discount = request.getDiscountAmount() == null
                ? BigDecimal.ZERO
                : request.getDiscountAmount().max(BigDecimal.ZERO);

        Bill bill = Bill.builder()
                .staff(staff)
                .customerName(request.getCustomerName())
                .customerPhone(request.getCustomerPhone())
                .paymentMethod(request.getPaymentMethod())
                .discountAmount(discount)
                .cashGiven(request.getCashGiven())
                .cashNotes(request.getCashNotes())
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
                    .costPrice(product.getCostPrice())
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

        // Tag the bill with the shop it belongs to and number it accordingly:
        // BILLG (grocery), BILLM (iMobile) or BILLX (both in one bill).
        String shop = shopOfItems(affectedProducts);
        bill.setShop(shop);
        bill.setBillNumber(billPrefix(shop) + LocalDateTime.now().format(BILL_DATE_FORMAT));

        // Loyalty: link the customer (by id, else by phone, else create from the
        // typed name), redeem their points as a discount (on by default) and award
        // points on the amount actually paid.
        Customer customer = customerService.resolveForBill(
                request.getCustomerId(), request.getCustomerPhone(), request.getCustomerName());
        boolean loyaltyEnabled = loyaltySettingsService.isEnabled();
        int pointValue = loyaltySettingsService.getPointValue();
        int pointsPerHundred = loyaltySettingsService.getPointsPerHundred();

        BigDecimal afterDiscount = total.subtract(discount).max(BigDecimal.ZERO);
        int redeem = 0;
        BigDecimal pointsDiscount = BigDecimal.ZERO;
        boolean wantsRedeem = request.getRedeemPoints() == null || request.getRedeemPoints();
        if (customer != null && loyaltyEnabled && wantsRedeem && pointValue > 0) {
            int balance = customer.getPoints() != null ? customer.getPoints() : 0;
            int maxByValue = afterDiscount.divide(BigDecimal.valueOf(pointValue), 0, RoundingMode.DOWN).intValue();
            redeem = Math.min(balance, maxByValue);
            pointsDiscount = BigDecimal.valueOf((long) redeem * pointValue);
        }

        BigDecimal payable = afterDiscount.subtract(pointsDiscount).max(BigDecimal.ZERO);

        int earned = 0;
        if (customer != null && loyaltyEnabled && pointsPerHundred > 0) {
            earned = payable.divide(BigDecimal.valueOf(100), 0, RoundingMode.DOWN).intValue() * pointsPerHundred;
        }

        // When only the customer id/phone is supplied, remember their name too so
        // the bill history reads properly.
        if (bill.getCustomerName() == null && customer != null) {
            bill.setCustomerName(customer.getName());
        }
        bill.setCustomer(customer);
        bill.setPointsRedeemed(redeem);
        bill.setPointsEarned(earned);
        bill.setPointsDiscount(pointsDiscount);
        bill.setTotal(payable);
        billRepository.save(bill);
        productRepository.saveAll(affectedProducts);

        if (customer != null && (redeem > 0 || earned > 0)) {
            customerService.applyBillPoints(customer, bill.getId(), redeem, earned);
        }

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

        BillDto saved = toDto(bill);
        // Every open desk screen hears about the bill, whether it was made here
        // or on a paired phone.
        bridgeService.broadcastBill(saved);
        return saved;
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
        LocalDateTime startDt = start.atStartOfDay();
        LocalDateTime endDt = end.atTime(23, 59, 59);
        List<Bill> bills = billRepository.findByCreatedAtBetween(startDt, endDt);

        Map<LocalDate, BigDecimal> totals = new HashMap<>();
        Map<LocalDate, BigDecimal> profits = new HashMap<>();
        Map<LocalDate, Long> counts = new HashMap<>();
        long itemsSold = 0;

        for (Bill bill : bills) {
            LocalDate day = bill.getCreatedAt().toLocalDate();
            totals.merge(day, bill.getTotal(), BigDecimal::add);
            profits.merge(day, profitOf(bill), BigDecimal::add);
            counts.merge(day, 1L, Long::sum);
            if (bill.getItems() != null) {
                itemsSold += bill.getItems().stream().mapToLong(BillItem::getQuantity).sum();
            }
        }

        List<DailySalesDto> daily = new ArrayList<>();
        BigDecimal totalSales = BigDecimal.ZERO;
        BigDecimal totalProfit = BigDecimal.ZERO;
        long billCount = 0;

        for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
            BigDecimal dayTotal = totals.getOrDefault(day, BigDecimal.ZERO);
            BigDecimal dayProfit = profits.getOrDefault(day, BigDecimal.ZERO);
            long dayCount = counts.getOrDefault(day, 0L);
            totalSales = totalSales.add(dayTotal);
            totalProfit = totalProfit.add(dayProfit);
            billCount += dayCount;
            daily.add(DailySalesDto.builder()
                    .date(day.toString())
                    .label(labelFn.apply(day))
                    .total(dayTotal)
                    .billCount(dayCount)
                    .profit(dayProfit)
                    .build());
        }

        return SalesReportDto.builder()
                .daily(daily)
                .totalSales(totalSales)
                .billCount(billCount)
                .itemsSold(itemsSold)
                .totalProfit(totalProfit)
                .build();
    }

    /**
     * Profit of one bill = amount actually charged minus the buying cost of the
     * units sold. Bills recorded before a buying price was known (cost null)
     * count their cost as zero.
     */
    private BigDecimal profitOf(Bill bill) {
        BigDecimal cost = BigDecimal.ZERO;
        if (bill.getItems() != null) {
            for (BillItem item : bill.getItems()) {
                BigDecimal unitCost = item.getCostPrice() != null ? item.getCostPrice() : BigDecimal.ZERO;
                cost = cost.add(unitCost.multiply(BigDecimal.valueOf(item.getQuantity())));
            }
        }
        return bill.getTotal().subtract(cost);
    }

    private BillDto toDto(Bill bill) {
        List<BillItemDto> itemDtos = bill.getItems().stream().map(item ->
                BillItemDto.builder()
                        .productId(item.getProduct() != null ? item.getProduct().getId() : null)
                        .productName(item.getProductName())
                        .quantity(item.getQuantity())
                        .price(item.getPrice())
                        .subtotal(item.getSubtotal())
                        .costPrice(item.getCostPrice())
                        .build()
        ).toList();

        return BillDto.builder()
                .id(bill.getId())
                .billNumber(bill.getBillNumber())
                .staffName(bill.getStaff().getFullName())
                .customerName(bill.getCustomerName())
                .customerId(bill.getCustomer() != null ? bill.getCustomer().getId() : null)
                .customerPhone(bill.getCustomerPhone())
                .total(bill.getTotal())
                .discountAmount(bill.getDiscountAmount())
                .pointsRedeemed(bill.getPointsRedeemed())
                .pointsEarned(bill.getPointsEarned())
                .pointsDiscount(bill.getPointsDiscount())
                .cashGiven(bill.getCashGiven())
                .cashNotes(bill.getCashNotes())
                .paymentMethod(bill.getPaymentMethod())
                .createdAt(bill.getCreatedAt())
                .shop(bill.getShop())
                .items(itemDtos)
                .build();
    }

    /** GROCERY, IMOBILE, or MIXED when a bill contains items from both shops. */
    private String shopOfItems(List<Product> products) {
        java.util.Set<String> shops = new java.util.HashSet<>();
        for (Product product : products) {
            shops.add(ProductService.normalizeShop(product.getShop()));
        }
        if (shops.size() > 1) {
            return "MIXED";
        }
        return shops.isEmpty() ? "GROCERY" : shops.iterator().next();
    }

    /** Bill-number prefix per shop: G = grocery, M = iMobile, X = mixed. */
    private String billPrefix(String shop) {
        return switch (shop) {
            case "IMOBILE" -> "BILLM";
            case "MIXED" -> "BILLX";
            default -> "BILLG";
        };
    }
}
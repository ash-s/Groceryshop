package com.groceryshop.cash;

import com.groceryshop.billing.Bill;
import com.groceryshop.billing.BillRepository;
import com.groceryshop.dto.CashCountDto;
import com.groceryshop.dto.CashCountRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * End-of-day cash counting and reconciliation.
 */
@Service
@RequiredArgsConstructor
public class CashCountService {

    private static final int[] DENOMINATIONS = {500, 200, 100, 50, 20, 10, 5, 2, 1};

    private final CashCountRepository cashCountRepository;
    private final BillRepository billRepository;

    @Transactional(readOnly = true)
    public CashCountDto getForDate(LocalDate date) {
        LocalDate day = date != null ? date : LocalDate.now();
        CashCount count = cashCountRepository.findByCountDate(day).orElse(null);
        return toDto(day, count);
    }

    @Transactional(readOnly = true)
    public List<CashCountDto> recent() {
        return cashCountRepository.findTop30ByOrderByCountDateDesc().stream()
                .map(count -> toDto(count.getCountDate(), count))
                .toList();
    }

    @Transactional
    public CashCountDto save(CashCountRequest request) {
        LocalDate day = request.getDate() != null ? request.getDate() : LocalDate.now();
        CashCount count = cashCountRepository.findByCountDate(day).orElseGet(() -> CashCount.builder()
                .countDate(day)
                .createdAt(LocalDateTime.now())
                .build());
        count.setN500(request.getN500());
        count.setN200(request.getN200());
        count.setN100(request.getN100());
        count.setN50(request.getN50());
        count.setN20(request.getN20());
        count.setN10(request.getN10());
        count.setN5(request.getN5());
        count.setN2(request.getN2());
        count.setN1(request.getN1());
        count.setTotal(valueOf(count));
        cashCountRepository.save(count);
        return toDto(day, count);
    }

    /** Cash expected in the till for a day: total of bills paid in cash. */
    @Transactional(readOnly = true)
    public BigDecimal expectedCash(LocalDate day) {
        LocalDateTime start = day.atStartOfDay();
        LocalDateTime end = day.atTime(LocalTime.MAX);
        return billRepository.findByCreatedAtBetween(start, end).stream()
                .filter(bill -> bill.getPaymentMethod() != null
                        && "CASH".equalsIgnoreCase(bill.getPaymentMethod().trim()))
                .map(Bill::getTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal valueOf(CashCount count) {
        long value = 500L * n(count.getN500()) + 200L * n(count.getN200()) + 100L * n(count.getN100())
                + 50L * n(count.getN50()) + 20L * n(count.getN20()) + 10L * n(count.getN10())
                + 5L * n(count.getN5()) + 2L * n(count.getN2()) + n(count.getN1());
        return BigDecimal.valueOf(value);
    }

    private static int n(Integer value) {
        return value != null ? value : 0;
    }

    private CashCountDto toDto(LocalDate day, CashCount count) {
        int[] counts = count == null
                ? new int[9]
                : new int[]{n(count.getN500()), n(count.getN200()), n(count.getN100()), n(count.getN50()),
                n(count.getN20()), n(count.getN10()), n(count.getN5()), n(count.getN2()), n(count.getN1())};

        BigDecimal total = count != null ? count.getTotal() : BigDecimal.ZERO;
        BigDecimal expected = expectedCash(day);
        BigDecimal difference = total.subtract(expected);

        List<CashCountDto.Denomination> denominations = new ArrayList<>();
        for (int i = 0; i < DENOMINATIONS.length; i++) {
            denominations.add(CashCountDto.Denomination.builder()
                    .value(DENOMINATIONS[i])
                    .count(counts[i])
                    .amount(BigDecimal.valueOf((long) DENOMINATIONS[i] * counts[i]))
                    .build());
        }

        return CashCountDto.builder()
                .id(count != null ? count.getId() : null)
                .date(day)
                .n500(counts[0])
                .n200(counts[1])
                .n100(counts[2])
                .n50(counts[3])
                .n20(counts[4])
                .n10(counts[5])
                .n5(counts[6])
                .n2(counts[7])
                .n1(counts[8])
                .total(total)
                .expected(expected)
                .difference(difference)
                .denominations(denominations)
                .build();
    }
}

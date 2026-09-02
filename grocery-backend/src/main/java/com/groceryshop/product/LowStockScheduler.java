package com.groceryshop.product;

import com.groceryshop.whatsapp.WhatsAppService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class LowStockScheduler {

    private final ProductRepository productRepository;
    private final WhatsAppService whatsAppService;

    @Scheduled(cron = "0 0 9 * * *")
    public void checkLowStock() {
        log.info("Running daily low-stock check");
        List<Product> lowStockProducts = productRepository.findLowStock();
        if (!lowStockProducts.isEmpty()) {
            whatsAppService.sendLowStockAlerts(lowStockProducts);
        }
    }
}
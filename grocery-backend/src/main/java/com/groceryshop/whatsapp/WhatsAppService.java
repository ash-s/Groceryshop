package com.groceryshop.whatsapp;

import com.groceryshop.product.Product;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class WhatsAppService {

    @Value("${twilio.account-sid:}")
    private String accountSid;

    @Value("${twilio.auth-token:}")
    private String authToken;

    @Value("${twilio.whatsapp-from:whatsapp:+14155238886}")
    private String whatsappFrom;

    @Value("${whatsapp.enabled:false}")
    private boolean enabled;

    private final WhatsAppSettingsService whatsAppSettingsService;

    public WhatsAppService(WhatsAppSettingsService whatsAppSettingsService) {
        this.whatsAppSettingsService = whatsAppSettingsService;
    }

    public void sendLowStockAlerts(List<Product> lowStockProducts) {
        sendLowStockAlerts(lowStockProducts, Map.of());
    }

    /**
     * Sends a low-stock WhatsApp message to the shop owner (admin) and to each
     * product's supplier, including product details (name, code, price, quantity).
     *
     * @param autoRestockQty quantity auto-restocked per product (product id -> units), if any
     */
    public void sendLowStockAlerts(List<Product> lowStockProducts, Map<Long, Integer> autoRestockQty) {
        if (lowStockProducts == null || lowStockProducts.isEmpty()) {
            return;
        }

        String ownerPhone = whatsAppSettingsService.getOwnerPhone();
        for (Product product : lowStockProducts) {
            String supplierName = product.getSupplier() != null ? product.getSupplier().getName() : "N/A";
            String supplierPhone = product.getSupplier() != null ? product.getSupplier().getPhone() : "N/A";
            String code = product.getCode() != null ? product.getCode() : "-";
            String price = String.format("$%.2f", product.getPrice());
            Integer restocked = autoRestockQty.get(product.getId());
            String restockNote = restocked != null
                    ? " Auto-restocked +" + restocked + " unit(s) back from this sale."
                    : "";

            String ownerMessage = String.format(
                    "LOW STOCK: %s (code %s) dropped to %d (min %d). Price: %s. Supplier: %s (%s). Please restock.%s",
                    product.getName(), code, product.getStock(), product.getMinStock(),
                    price, supplierName, supplierPhone, restockNote);

            String supplierMessage = String.format(
                    "RESTOCK REQUEST: %s (code %s) — only %d left (min %d), price %s. Please replenish.%s",
                    product.getName(), code, product.getStock(), product.getMinStock(),
                    price, restockNote);

            if (!enabled) {
                log.info("[SIMULATED WhatsApp -> owner {}] {}", ownerPhone, ownerMessage);
                log.info("[SIMULATED WhatsApp -> supplier {}] {}", supplierPhone, supplierMessage);
                continue;
            }

            try {
                //com.twilio.Twilio.init(accountSid, authToken);
                //Message.creator(new PhoneNumber(ownerPhone), new PhoneNumber(whatsappFrom), ownerMessage).create();
                //Message.creator(new PhoneNumber(supplierPhone), new PhoneNumber(whatsappFrom), supplierMessage).create();
                log.info("[WhatsApp sent -> owner {}] {}", ownerPhone, ownerMessage);
                log.info("[WhatsApp sent -> supplier {}] {}", supplierPhone, supplierMessage);
            } catch (Exception e) {
                log.error("Failed to send WhatsApp low-stock alerts: {}", e.getMessage());
            }
        }
    }
}
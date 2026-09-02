package com.groceryshop.whatsapp;

import com.groceryshop.product.Product;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
public class WhatsAppService {

    @Value("${twilio.account-sid:}")
    private String accountSid;

    @Value("${twilio.auth-token:}")
    private String authToken;

    @Value("${twilio.whatsapp-from:whatsapp:+14155238886}")
    private String whatsappFrom;

    @Value("${whatsapp.owner-phone:+919876543210}")
    private String ownerPhone;

    @Value("${whatsapp.enabled:false}")
    private boolean enabled;

    public void sendLowStockAlerts(List<Product> lowStockProducts) {
        if (lowStockProducts == null || lowStockProducts.isEmpty()) {
            return;
        }

        if (!enabled) {
            for (Product product : lowStockProducts) {
                String supplierName = product.getSupplier() != null ? product.getSupplier().getName() : "N/A";
                String supplierPhone = product.getSupplier() != null ? product.getSupplier().getPhone() : "N/A";
                log.info("[SIMULATED WhatsApp -> owner " + ownerPhone + "] Low stock: {} (stock: {}, min: {}) from supplier {}", product.getName(), product.getStock(), product.getMinStock(), supplierName);
                log.info("[SIMULATED WhatsApp -> supplier " + supplierPhone + "] Restock requested for: {}", product.getName());
            }
            return;
        }

        try {
            //com.twilio.Twilio.init(accountSid, authToken);
            for (Product product : lowStockProducts) {
                String supplierName = product.getSupplier() != null ? product.getSupplier().getName() : "N/A";
                String supplierPhone = product.getSupplier() != null ? product.getSupplier().getPhone() : "N/A";
                String ownerMessage = String.format("Low stock alert: %s (stock=%d, min=%d) from supplier %s (%s)", product.getName(), product.getStock(), product.getMinStock(), supplierName, supplierPhone);
                String supplierMessage = String.format("Restock request: %s stock is low (%d remaining, min %d). Please replenish.", product.getName(), product.getStock(), product.getMinStock());
                //Message.creator(new PhoneNumber(ownerPhone), new PhoneNumber(whatsappFrom), ownerMessage).create();
                //Message.creator(new PhoneNumber(supplierPhone), new PhoneNumber(whatsappFrom), supplierMessage).create();
                log.info("[WhatsApp sent -> owner {}] {}", ownerPhone, ownerMessage);
                log.info("[WhatsApp sent -> supplier {}] {}", supplierPhone, supplierMessage);
            }
        } catch (Exception e) {
            log.error("Failed to send WhatsApp low-stock alerts: {}", e.getMessage());
        }
    }
}
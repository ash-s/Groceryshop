package com.groceryshop.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.groceryshop.dto.WhatsAppTestResult;
import com.groceryshop.product.Product;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Low-stock WhatsApp alerts. Two channels:
 * <ul>
 *   <li>Free wa.me click-to-chat (frontend) - always available, no setup.</li>
 *   <li>Meta Cloud API ("WhatsApp Business Platform") - real, automated alerts.
 *       The API is free to set up and includes 1,000 free service conversations
 *       per month. Business-initiated messages must use an approved message
 *       template, so alerts are sent with the configured template. While no
 *       credentials are configured (or the toggle is off) alerts are logged to
 *       the backend console only (simulated mode).</li>
 * </ul>
 */
@Slf4j
@Service
public class WhatsAppService {

    @Value("${whatsapp.meta-api-version:v21.0}")
    private String apiVersion;

    private final WhatsAppSettingsService whatsAppSettingsService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private String lastMetaError = "";

    public WhatsAppService(WhatsAppSettingsService whatsAppSettingsService, ObjectMapper objectMapper) {
        this.whatsAppSettingsService = whatsAppSettingsService;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /** True when the admin enabled real Meta alerts and the credentials are filled in. */
    public boolean isMetaConfigured() {
        return whatsAppSettingsService.isMetaEnabled()
                && notBlank(whatsAppSettingsService.getMetaToken())
                && notBlank(whatsAppSettingsService.getMetaPhoneNumberId());
    }

    public void sendLowStockAlerts(List<Product> lowStockProducts) {
        sendLowStockAlerts(lowStockProducts, Map.of());
    }

    /**
     * Sends a low-stock WhatsApp message to the shop owner (admin) and to each
     * product's supplier, including product details (name, code, price, quantity).
     *
     * @param lowStockProducts products that hit their minimum
     * @param autoRestockQty   quantity auto-restocked per product (product id -> units), if any
     */
    public void sendLowStockAlerts(List<Product> lowStockProducts, Map<Long, Integer> autoRestockQty) {
        if (lowStockProducts == null || lowStockProducts.isEmpty()) {
            return;
        }

        String ownerPhone = whatsAppSettingsService.getOwnerPhone();
        boolean real = isMetaConfigured();

        for (Product product : lowStockProducts) {
            String supplierName = product.getSupplier() != null ? product.getSupplier().getName() : "N/A";
            String supplierPhone = product.getSupplier() != null ? product.getSupplier().getPhone() : "";
            String code = product.getBarcode() != null ? product.getBarcode()
                    : (product.getCode() != null ? product.getCode() : "-");
            String price = String.format("\u20B9%.2f", product.getPrice());
            Integer restocked = autoRestockQty.get(product.getId());
            String restockNote = restocked != null
                    ? " Auto-restocked +" + restocked + " from this sale."
                    : "";
            String stock = String.valueOf(product.getStock());
            String min = String.valueOf(product.getMinStock());

            if (!real) {
                log.info("[SIMULATED WhatsApp -> owner {}] LOW STOCK: {} (code {}), {} left (min {}). "
                        + "Price {}. Supplier: {}.{}", ownerPhone, product.getName(), code, stock, min,
                        price, supplierName, restockNote);
                if (notBlank(supplierPhone)) {
                    log.info("[SIMULATED WhatsApp -> supplier {}] RESTOCK REQUEST: {} (code {}), {} left (min {}).{}",
                            supplierPhone, product.getName(), code, stock, min, restockNote);
                }
                continue;
            }

            List<String> params = templateParams(product.getName(), code, stock, min, price, supplierName, restockNote);
            if (sendMetaTemplate(ownerPhone, params)) {
                log.info("[Meta WhatsApp sent -> owner {}] {} (code {})", ownerPhone, product.getName(), code);
            }
            if (notBlank(supplierPhone) && sendMetaTemplate(supplierPhone, params)) {
                log.info("[Meta WhatsApp sent -> supplier {}] {} (code {})", supplierPhone, product.getName(), code);
            }
        }
    }

    /**
     * Sends the daily "delivery expected" reminder to the shop owner. Uses the same
     * approved template with the order details; simulated (console only) until Meta
     * alerts are configured and enabled.
     */
    public void sendDeliveryReminder(String productName, String codeValue, int quantity,
                                     java.time.LocalDate expectedDate, String deliveryMethod,
                                     String supplierName, int minStock) {
        String ownerPhone = whatsAppSettingsService.getOwnerPhone();
        String code = codeValue != null ? codeValue : "-";
        String expected = expectedDate != null ? expectedDate.toString() : "-";
        String method = deliveryMethod != null ? deliveryMethod : "Delivery";
        String due = expectedDate != null && !expectedDate.isBefore(java.time.LocalDate.now())
                ? "expected today" : "overdue";
        String note = "Delivery " + due + ". Confirm receipt on the Restock page to add " + quantity + " to stock.";
        boolean real = isMetaConfigured();

        if (!real) {
            log.info("[SIMULATED WhatsApp -> owner {}] DELIVERY REMINDER: {} (code {}), {} units, {} {}. "
                    + "Supplier: {}. {}", ownerPhone, productName, code, quantity, method, due, supplierName, note);
            return;
        }
        List<String> params = templateParams(productName, code, String.valueOf(quantity),
                expected, "-", supplierName, note);
        if (sendMetaTemplate(ownerPhone, params)) {
            log.info("[Meta WhatsApp sent -> owner {}] delivery reminder for {} (code {})", ownerPhone, productName, code);
        }
    }

    /**
     * Sends a manual test alert to the saved owner number so the admin can verify
     * the channel works. Uses the Meta template when configured, otherwise logs to
     * the backend console (simulated mode).
     */
    public WhatsAppTestResult sendTestAlert() {
        String ownerPhone = whatsAppSettingsService.getOwnerPhone();
        if (!isMetaConfigured()) {
            log.info("[SIMULATED WhatsApp -> owner {}] TEST: This is a test alert from GroceryShop.", ownerPhone);
            return new WhatsAppTestResult(false, ownerPhone, "SIMULATED",
                    "Logged to the backend console only. To receive real messages: enter the Meta access token "
                            + "and phone number ID on the Restock page, create the message template, and enable "
                            + "real alerts. Or use the free Open WhatsApp button.");
        }
        List<String> params = templateParams("My Store Test", "TEST", "-", "-", "-", "-",
                "This is a test alert from GroceryShop. Everything is working!");
        if (sendMetaTemplate(ownerPhone, params)) {
            return new WhatsAppTestResult(true, ownerPhone, "SENT",
                    "Test alert sent via Meta Cloud API to " + ownerPhone + ".");
        }
        return new WhatsAppTestResult(true, ownerPhone, "FAILED",
                "Meta API rejected the message: " + lastMetaError);
    }

    /**
     * Builds the template body parameters. Meta Cloud API requires the first body
     * parameter to be the literal "1" so the template's {{1}} renders as "1" and
     * the {{2}}..{{8}} placeholders carry the alert details.
     */
    private List<String> templateParams(String product, String code, String stock, String min,
                                        String price, String supplier, String note) {
        List<String> params = new ArrayList<>();
        params.add("1");
        params.add(product);
        params.add(code);
        params.add(stock);
        params.add(min);
        params.add(price);
        params.add(supplier);
        params.add(note);
        return params;
    }

    /**
     * Sends a free-form message (offer, price change, ...) to a customer on
     * WhatsApp. Simulated (console only) until Meta alerts are configured.
     */
    public boolean sendCustomerMessage(String to, String customerName, String message) {
        if (!notBlank(to)) {
            return false;
        }
        if (!isMetaConfigured()) {
            log.info("[SIMULATED WhatsApp -> customer {} ({})] {}", to, customerName, message);
            return true;
        }
        List<String> params = templateParams("Offer", "-", "-", "-", "-", "GroceryShop", message);
        return sendMetaTemplate(to, params);
    }

    private boolean sendMetaTemplate(String to, List<String> parameters) {
        String token = whatsAppSettingsService.getMetaToken();
        String phoneNumberId = whatsAppSettingsService.getMetaPhoneNumberId();
        String templateName = whatsAppSettingsService.getMetaTemplateName();
        String recipient = to.replaceAll("[^0-9]", "");
        String url = "https://graph.facebook.com/" + apiVersion + "/" + phoneNumberId + "/messages";
        try {
            Map<String, Object> component = new LinkedHashMap<>();
            component.put("type", "body");
            List<Map<String, String>> paramObjs = new ArrayList<>();
            for (String value : parameters) {
                Map<String, String> paramObj = new LinkedHashMap<>();
                paramObj.put("type", "text");
                paramObj.put("text", value);
                paramObjs.add(paramObj);
            }
            component.put("parameters", paramObjs);

            Map<String, Object> template = new LinkedHashMap<>();
            template.put("name", templateName);
            Map<String, String> language = new LinkedHashMap<>();
            language.put("code", "en");
            template.put("language", language);
            template.put("components", List.of(component));

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("messaging_product", "whatsapp");
            body.put("to", recipient);
            body.put("type", "template");
            body.put("template", template);

            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", "Bearer " + token)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200 || response.statusCode() == 201) {
                lastMetaError = "";
                return true;
            }
            lastMetaError = extractMetaError(response.body());
            log.error("Meta WhatsApp send to {} failed (HTTP {}): {}", recipient, response.statusCode(), lastMetaError);
            return false;
        } catch (Exception e) {
            lastMetaError = e.getMessage();
            log.error("Meta WhatsApp send to {} failed: {}", to, lastMetaError);
            return false;
        }
    }

    private String extractMetaError(String json) {
        try {
            JsonNode node = objectMapper.readTree(json);
            JsonNode error = node.path("error");
            if (error.has("message")) {
                return error.get("message").asText();
            }
            return json;
        } catch (Exception e) {
            return json;
        }
    }

    private static boolean notBlank(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
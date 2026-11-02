package com.groceryshop.bridge;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.groceryshop.device.LanAddress;
import com.groceryshop.product.Product;
import com.groceryshop.product.ProductRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;

/**
 * Keeps the desk and the phone in step.
 *
 * The phone only ever sends a raw barcode. This service resolves it exactly the
 * same way the desk camera does - printed barcode first, then the short till
 * code, whitespace stripped, never a partial guess - and pushes the outcome to
 * every desk screen watching the session.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BridgeService {

    /** A pairing is valid for one working day; the desk can make a new one any time. */
    private static final Duration TTL = Duration.ofHours(12);

    private final ProductRepository productRepository;
    private final ObjectMapper objectMapper;

    @org.springframework.beans.factory.annotation.Value("${app.https.port:8443}")
    private int httpsPort;

    private final Map<String, BridgeSession> byId = new ConcurrentHashMap<>();
    private final Map<String, BridgeSession> byCode = new ConcurrentHashMap<>();
    private final Map<String, CopyOnWriteArrayList<SseEmitter>> listeners = new ConcurrentHashMap<>();

    private ScheduledExecutorService heartbeat;

    @PostConstruct
    void startHeartbeat() {
        heartbeat = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "bridge-heartbeat");
            t.setDaemon(true);
            return t;
        });
        heartbeat.scheduleAtFixedRate(this::pingAll, 20, 20, TimeUnit.SECONDS);
    }

    @PreDestroy
    void stopHeartbeat() {
        if (heartbeat != null) heartbeat.shutdownNow();
    }

    // ------------------------------------------------------------------ sessions

    public BridgeSession create(String ownerUsername) {
        evictExpired();
        String code = uniqueCode();
        BridgeSession session = new BridgeSession(
                UUID.randomUUID().toString(), code, UUID.randomUUID().toString(), ownerUsername);
        byId.put(session.getId(), session);
        byCode.put(code, session);
        return session;
    }

    public Optional<BridgeSession> findById(String id) {
        BridgeSession session = byId.get(id);
        return session != null && !expired(session) ? Optional.of(session) : Optional.empty();
    }

    public Optional<BridgeSession> findByToken(String token) {
        if (token == null || token.isBlank()) return Optional.empty();
        for (BridgeSession session : byId.values()) {
            if (session.getToken().equals(token) && !expired(session)) return Optional.of(session);
        }
        return Optional.empty();
    }

    public Optional<BridgeSession> join(String code, String token, String device) {
        BridgeSession session = null;
        if (token != null && !token.isBlank()) {
            session = findByToken(token).orElse(null);
        }
        if (session == null && code != null && !code.isBlank()) {
            BridgeSession byShortCode = byCode.get(code.trim());
            if (byShortCode != null && !expired(byShortCode)) session = byShortCode;
        }
        if (session == null) return Optional.empty();
        session.markPhoneConnected(device == null || device.isBlank() ? "Phone" : device.trim());
        pushState(session);
        log.debug("Phone paired to bridge session {} ({})", session.getCode(), session.getPhoneLabel());
        return Optional.of(session);
    }

    public void setMode(BridgeSession session, String mode) {
        String safe = switch (mode == null ? "" : mode.trim().toUpperCase()) {
            case BridgeSession.MODE_ADD_PRODUCT -> BridgeSession.MODE_ADD_PRODUCT;
            case BridgeSession.MODE_RESTOCK -> BridgeSession.MODE_RESTOCK;
            case BridgeSession.MODE_STOCK -> BridgeSession.MODE_STOCK;
            case BridgeSession.MODE_PHONE_BILL -> BridgeSession.MODE_PHONE_BILL;
            default -> BridgeSession.MODE_BILLING;
        };
        session.setMode(safe);
        pushState(session);
    }

    public String phoneUrl(String token) {
        String lan = LanAddress.find();
        if (lan == null) return null;
        return "https://" + lan + ":" + httpsPort + "/scan?t=" + token;
    }

    // ------------------------------------------------------------------ scanning

    public BridgeDtos.ScanResult scan(BridgeSession session, String rawCode) {
        session.touch();
        String code = rawCode == null ? "" : rawCode.replaceAll("[\\s\\r\\n]+", "");
        if (code.isEmpty()) {
            return BridgeDtos.ScanResult.fail("", "Nothing was read. Hold the camera steadier.", session.getMode());
        }

        Optional<Product> exactBarcode = productRepository.findByBarcode(code);
        Optional<Product> exactCode = exactBarcode.isPresent()
                ? Optional.empty()
                : productRepository.findByCode(code);

        Product product = exactBarcode.or(() -> exactCode).orElse(null);
        if (product == null) {
            BridgeDtos.ScanResult miss = BridgeDtos.ScanResult.fail(code,
                    "No product matches the code " + code + ".", session.getMode());
            emit(session, "scan", miss);
            return miss;
        }
        if (product.getStock() == null || product.getStock() <= 0) {
            BridgeDtos.ScanResult empty = BridgeDtos.ScanResult.fail(code,
                    "Out of stock: " + product.getName() + ".", session.getMode());
            empty = new BridgeDtos.ScanResult(false, code, product.getId(), product.getName(),
                    product.getPrice(), 0, empty.message(), session.getMode(), empty.at());
            emit(session, "scan", empty);
            return empty;
        }

        BridgeDtos.ScanResult hit = new BridgeDtos.ScanResult(true, code, product.getId(),
                product.getName(), product.getPrice(), product.getStock(), null, session.getMode(),
                java.time.LocalDateTime.now().toString());
        emit(session, "scan", hit);
        return hit;
    }

    // ------------------------------------------------------------------ events

    public SseEmitter subscribe(String sessionId) {
        SseEmitter emitter = new SseEmitter(0L);
        CopyOnWriteArrayList<SseEmitter> list =
                listeners.computeIfAbsent(sessionId, key -> new CopyOnWriteArrayList<>());
        list.add(emitter);

        Runnable cleanup = () -> {
            list.remove(emitter);
            if (list.isEmpty()) listeners.remove(sessionId, list);
        };
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(error -> cleanup.run());

        try {
            emitter.send(SseEmitter.event().name("ready").data("{}"));
        } catch (IOException e) {
            cleanup.run();
        }
        return emitter;
    }

    public void emit(BridgeSession session, String event, Object payload) {
        CopyOnWriteArrayList<SseEmitter> list = listeners.get(session.getId());
        if (list == null || list.isEmpty()) return;
        String json = toJson(payload);
        List<SseEmitter> dead = new ArrayList<>();
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event().name(event).data(json));
            } catch (Exception e) {
                dead.add(emitter);
            }
        }
        list.removeAll(dead);
    }

    /** Fans a completed bill out to every open desk screen. */
    public void broadcastBill(Object billDto) {
        String json = toJson(billDto);
        for (Map.Entry<String, CopyOnWriteArrayList<SseEmitter>> entry : listeners.entrySet()) {
            for (SseEmitter emitter : entry.getValue()) {
                try {
                    emitter.send(SseEmitter.event().name("bill").data(json));
                } catch (Exception e) {
                    entry.getValue().remove(emitter);
                }
            }
        }
    }

    public void pushState(BridgeSession session) {
        Map<String, Object> body = Map.of(
                "mode", session.getMode(),
                "phoneConnected", session.isPhoneConnected(),
                "phoneLabel", session.getPhoneLabel() == null ? "" : session.getPhoneLabel());
        emit(session, "state", body);
    }

    private void pingAll() {
        for (Map.Entry<String, CopyOnWriteArrayList<SseEmitter>> entry : listeners.entrySet()) {
            for (SseEmitter emitter : entry.getValue()) {
                try {
                    emitter.send(SseEmitter.event().comment("ping"));
                } catch (Exception e) {
                    entry.getValue().remove(emitter);
                }
            }
        }
    }

    private String toJson(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            return "{}";
        }
    }

    // ------------------------------------------------------------------ housekeeping

    private boolean expired(BridgeSession session) {
        return session.getCreatedAt().isBefore(Instant.now().minus(TTL));
    }

    private void evictExpired() {
        List<String> gone = new ArrayList<>();
        for (BridgeSession session : byId.values()) {
            if (expired(session)) gone.add(session.getId());
        }
        for (String id : gone) {
            BridgeSession removed = byId.remove(id);
            if (removed != null) byCode.remove(removed.getCode(), removed);
            listeners.remove(id);
        }
    }

    private String uniqueCode() {
        for (int attempt = 0; attempt < 50; attempt++) {
            String code = String.valueOf(ThreadLocalRandom.current().nextInt(100000, 1000000));
            if (!byCode.containsKey(code)) return code;
        }
        return UUID.randomUUID().toString().substring(0, 6);
    }
}

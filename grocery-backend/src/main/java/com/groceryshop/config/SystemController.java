package com.groceryshop.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Used by the desktop launcher, never by a person.
 *
 * /health answers only once the app can actually serve a bill, so the launcher
 * can open the window at the right moment instead of guessing a delay.
 *
 * /stop lets the launcher close the shop cleanly (Spring context first, then the
 * database) instead of killing the process mid-write. It is protected by a
 * one-time token the launcher generates on every start.
 */
@RestController
@RequestMapping("/api/system")
@RequiredArgsConstructor
public class SystemController {

    private final ApplicationContext applicationContext;

    @Value("${app.control-token:}")
    private String controlToken;

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "ok");
        body.put("app", "GroceryShop");
        return body;
    }

    @PostMapping("/stop")
    public Map<String, Object> stop(@RequestHeader(value = "X-Control-Token", required = false) String token) {
        if (controlToken == null || controlToken.isBlank() || !controlToken.equals(token)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed");
        }
        // Answer the caller before the context goes away.
        Thread stopping = new Thread(() -> {
            try {
                Thread.sleep(250);
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            }
            SpringApplication.exit(applicationContext, () -> 0);
            System.exit(0);
        }, "launcher-stop");
        stopping.setDaemon(false);
        stopping.start();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "stopping");
        return body;
    }
}

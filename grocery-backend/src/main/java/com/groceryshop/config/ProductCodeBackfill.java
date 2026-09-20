package com.groceryshop.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Assigns a 4-digit code (0001, 0002, ...) to any product that doesn't have one yet,
 * so the POS can be driven by code/barcode entry. Runs after Flyway on every startup,
 * is idempotent, and avoids adding any new migration version.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ProductCodeBackfill implements CommandLineRunner {

    // The code is derived from the primary key, so it is unique by construction
    // (matches the unique index uk_products_code on the code column).
    private static final String SQL =
            "UPDATE products SET code = LPAD(id, 4, '0') WHERE code IS NULL";

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        int updated = jdbcTemplate.update(SQL);
        if (updated > 0) {
            log.info("Assigned product codes to {} product(s).", updated);
        }
    }
}
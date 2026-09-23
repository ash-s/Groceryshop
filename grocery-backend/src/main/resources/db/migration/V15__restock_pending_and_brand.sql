-- V15: brand on products + pending-delivery restock support.
-- Additive only. Existing rows in restock_events are already-received stock adds,
-- so they default to status DELIVERED and have no expected delivery.

ALTER TABLE products
    ADD COLUMN brand VARCHAR(100) NULL;

ALTER TABLE restock_events
    ADD COLUMN expected_delivery DATE NULL,
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'DELIVERED',
    ADD COLUMN delivered_at TIMESTAMP NULL,
    ADD COLUMN alert_sent_on DATE NULL;
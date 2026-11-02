-- Phase 3: remember which supplier a restock / purchase came from, so each
-- supplier page can show its product mapping and purchase history.
ALTER TABLE restock_events ADD COLUMN supplier_id BIGINT NULL;
ALTER TABLE restock_events ADD CONSTRAINT fk_restock_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id);
CREATE INDEX idx_restock_supplier ON restock_events (supplier_id);

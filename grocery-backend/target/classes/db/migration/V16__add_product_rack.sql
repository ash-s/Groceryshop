-- V16: rack/shelf location label for placing products in the store.
-- Additive only. Optional free-text location, e.g. "A2" or "Aisle 3 Shelf B".
ALTER TABLE products ADD COLUMN rack VARCHAR(100) NULL;
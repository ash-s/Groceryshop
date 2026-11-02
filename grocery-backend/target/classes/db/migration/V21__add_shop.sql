-- Phase 4: shop tagging (Grocery vs iMobile). Additive only.
ALTER TABLE products ADD COLUMN shop VARCHAR(20) NOT NULL DEFAULT 'GROCERY';
ALTER TABLE bills ADD COLUMN shop VARCHAR(20) NOT NULL DEFAULT 'GROCERY';
CREATE INDEX idx_products_shop ON products (shop);
CREATE INDEX idx_bills_shop ON bills (shop);

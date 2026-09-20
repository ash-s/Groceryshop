-- Product code (barcode / quick-add code) for fast checkout.
ALTER TABLE products ADD COLUMN code VARCHAR(50) NULL;

-- Unique index: MySQL allows multiple NULLs, so products without a code are fine.
CREATE UNIQUE INDEX uk_products_code ON products (code);
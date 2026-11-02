-- V18: separate the printed barcode from the internal short code, and add
-- buying (cost) price + expiry date to products. Also snapshot the buying
-- price per sold line and a bill-level discount, to support profit reports.
--
-- Additive only: existing columns and data are preserved.

ALTER TABLE products ADD COLUMN barcode VARCHAR(50) NULL;
ALTER TABLE products ADD COLUMN cost_price DECIMAL(10,2) NULL;
ALTER TABLE products ADD COLUMN expiry_date DATE NULL;

-- Anything already in `code` that looks like a real printed barcode (8+ digits)
-- moves into the new barcode column; short till codes like "0001" stay in `code`
-- so manual typing keeps working exactly as before.
UPDATE products SET barcode = code WHERE code REGEXP '^[0-9]{8,}$';
UPDATE products SET code = NULL WHERE barcode IS NOT NULL;

CREATE UNIQUE INDEX uk_products_barcode ON products (barcode);

-- Buying price at the moment of sale, so profit can be computed later even if
-- the product's buying price changes.
ALTER TABLE bill_items ADD COLUMN cost_price DECIMAL(10,2) NULL;

-- Discount (in rupees) applied to the whole bill at checkout.
ALTER TABLE bills ADD COLUMN discount_amount DECIMAL(10,2) NULL;

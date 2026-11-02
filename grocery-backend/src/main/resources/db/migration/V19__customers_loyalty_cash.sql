-- Phase 2: customers, loyalty points and end-of-day cash counting.
-- Purely additive: new tables plus nullable columns on bills.

CREATE TABLE customers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(20) NULL,
    points INT NOT NULL DEFAULT 0,
    notes VARCHAR(500) NULL,
    created_at DATETIME NOT NULL
);

CREATE INDEX idx_customers_phone ON customers (phone);

CREATE TABLE point_entries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    bill_id BIGINT NULL,
    points INT NOT NULL,
    reason VARCHAR(80) NOT NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_point_entries_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
);

CREATE INDEX idx_point_entries_customer ON point_entries (customer_id);

-- End-of-day physical cash count, one row per day.
CREATE TABLE cash_counts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    count_date DATE NOT NULL,
    n500 INT NOT NULL DEFAULT 0,
    n200 INT NOT NULL DEFAULT 0,
    n100 INT NOT NULL DEFAULT 0,
    n50 INT NOT NULL DEFAULT 0,
    n20 INT NOT NULL DEFAULT 0,
    n10 INT NOT NULL DEFAULT 0,
    n5 INT NOT NULL DEFAULT 0,
    n2 INT NOT NULL DEFAULT 0,
    n1 INT NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    CONSTRAINT uk_cash_counts_date UNIQUE (count_date)
);

-- Bills gain an optional customer link, the cash tendered by the customer
-- (including which notes they handed over) and the loyalty movement.
ALTER TABLE bills ADD COLUMN customer_id BIGINT NULL;
ALTER TABLE bills ADD COLUMN customer_phone VARCHAR(20) NULL;
ALTER TABLE bills ADD COLUMN cash_given DECIMAL(10,2) NULL;
ALTER TABLE bills ADD COLUMN cash_notes VARCHAR(255) NULL;
ALTER TABLE bills ADD COLUMN points_redeemed INT NULL;
ALTER TABLE bills ADD COLUMN points_earned INT NULL;
ALTER TABLE bills ADD COLUMN points_discount DECIMAL(10,2) NULL;
ALTER TABLE bills ADD CONSTRAINT fk_bills_customer FOREIGN KEY (customer_id) REFERENCES customers (id);

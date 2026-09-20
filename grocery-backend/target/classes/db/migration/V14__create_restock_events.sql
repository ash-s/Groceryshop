CREATE TABLE restock_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    event_type VARCHAR(20) NOT NULL,
    delivery_method VARCHAR(30),
    received_at TIMESTAMP,
    cost_per_unit DECIMAL(10,2),
    notes VARCHAR(500),
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_restock_event_product FOREIGN KEY (product_id) REFERENCES products(id)
);
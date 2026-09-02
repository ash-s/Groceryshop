INSERT INTO categories (name, description) VALUES
('Vegetables', 'Fresh vegetables from local farms'),
('Fruits', 'Seasonal and fresh fruits'),
('Dairy', 'Milk, cheese, butter and more'),
('Bakery', 'Bread, cakes and baked goods'),
('Personal Care', 'Soaps, shampoos and toiletries'),
('Beverages', 'Juices, cold drinks and tea'),
('Snacks', 'Chips, cookies and munchies');

INSERT INTO suppliers (name, company, phone, email, address) VALUES
('Ramesh Kumar', 'ABC Traders', '+919876543210', 'ramesh@abctraders.com', '45 Market Road, Mumbai'),
('Suresh Patel', 'Fresh Foods Ltd', '+919876543211', 'suresh@freshfoods.com', '12 Industrial Area, Pune'),
('Priya Sharma', 'Green Farms', '+919876543212', 'priya@greenfarms.com', '88 Village Road, Nashik');

INSERT INTO products (name, description, price, stock, min_stock, category_id, supplier_id) VALUES
('Fresh Broccoli', 'Organic broccoli rich in vitamins C & K', 2.99, 15, 10, 1, 3),
('Carrots (1kg)', 'Sweet and crunchy fresh carrots', 1.49, 50, 15, 1, 3),
('Onions (1kg)', 'Fresh red onions', 0.99, 60, 20, 1, 2),
('Organic Apples (1kg)', 'Sweet and crisp apples', 1.49, 45, 15, 2, 2),
('Bananas (1 dozen)', 'Ripe yellow bananas', 0.79, 60, 20, 2, 2),
('Fresh Milk (1L)', 'Full cream cow milk', 3.49, 30, 10, 3, 1),
('Cheddar Cheese (200g)', 'Aged cheddar cheese block', 4.99, 8, 10, 3, 1),
('Whole Wheat Bread', 'Freshly baked whole wheat loaf', 2.99, 5, 8, 4, 1),
('Orange Juice (1L)', '100% pure orange juice', 5.99, 25, 10, 6, 2),
('Potato Chips', 'Classic salted potato chips', 1.99, 40, 15, 7, 3);

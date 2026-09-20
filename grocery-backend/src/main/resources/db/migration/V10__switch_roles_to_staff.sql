-- GroceryShop is a staff management system: no customer accounts.
-- Step 1: widen the ENUM so existing CUSTOMER rows can be converted.
ALTER TABLE users MODIFY role ENUM('CUSTOMER', 'STAFF', 'ADMIN') NOT NULL DEFAULT 'STAFF';

-- Step 2: every existing customer becomes staff.
UPDATE users SET role = 'STAFF' WHERE role = 'CUSTOMER';

-- Step 3: tighten the ENUM back to staff-only values.
ALTER TABLE users MODIFY role ENUM('STAFF', 'ADMIN') NOT NULL DEFAULT 'STAFF';
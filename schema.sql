-- Local database schema for the auto parts store
-- Run this once to set up the tables

-- Using Railway-hosted database (database name: railway)
USE railway;

-- Customer orders
CREATE TABLE IF NOT EXISTS orders (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  email         VARCHAR(100) NOT NULL,
  address       VARCHAR(255) NOT NULL,
  cc_last4      CHAR(4)      NOT NULL,
  subtotal      DECIMAL(10,2) NOT NULL,
  shipping      DECIMAL(10,2) NOT NULL,
  total         DECIMAL(10,2) NOT NULL,
  auth_number   VARCHAR(100) NOT NULL,
  status        ENUM('authorized','packed','shipped','cancelled') NOT NULL DEFAULT 'authorized',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Line items for each order
CREATE TABLE IF NOT EXISTS order_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  order_id    INT NOT NULL,
  part_number INT NOT NULL,
  description VARCHAR(100) NOT NULL,
  price       DECIMAL(10,2) NOT NULL,
  weight      DECIMAL(6,2)  NOT NULL,
  qty         INT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Shipping rate brackets (weight in lbs, fee in dollars)
-- Seed with defaults matching the client-side calc
CREATE TABLE IF NOT EXISTS shipping_rates (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  max_weight DECIMAL(6,2) NOT NULL,
  fee        DECIMAL(6,2) NOT NULL
);

INSERT INTO shipping_rates (max_weight, fee) VALUES
  (5.00,  5.99),
  (15.00, 9.99),
  (30.00, 14.99),
  (9999.00, 19.99)
ON DUPLICATE KEY UPDATE fee = VALUES(fee);

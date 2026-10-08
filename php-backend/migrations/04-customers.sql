-- RestaurOS — Migración: Clientes y Operación
-- CRM, monedero/lealtad, reservaciones y domicilios.
USE tallerch_restauros;

-- Clientes con monedero electrónico y puntos de lealtad.
CREATE TABLE IF NOT EXISTS customers (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  branch_id      INT           NOT NULL,
  name           VARCHAR(150)  NOT NULL,
  phone          VARCHAR(30)   NULL,
  email          VARCHAR(150)  NULL,
  address        TEXT          NULL,
  points         INT           NOT NULL DEFAULT 0,     -- puntos de lealtad
  wallet_balance DECIMAL(10,2) NOT NULL DEFAULT 0,     -- saldo del monedero
  total_spent    DECIMAL(12,2) NOT NULL DEFAULT 0,
  visits         INT           NOT NULL DEFAULT 0,
  active         TINYINT(1)    NOT NULL DEFAULT 1,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_branch (branch_id),
  INDEX idx_phone (phone)
);

-- Repartidores para pedidos a domicilio.
CREATE TABLE IF NOT EXISTS drivers (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  branch_id  INT           NOT NULL,
  name       VARCHAR(120)  NOT NULL,
  phone      VARCHAR(30)   NULL,
  active     TINYINT(1)    NOT NULL DEFAULT 1,
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_branch (branch_id)
);

-- Reservaciones.
CREATE TABLE IF NOT EXISTS reservations (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  branch_id     INT          NOT NULL,
  customer_id   INT          NULL,
  customer_name VARCHAR(150) NOT NULL,
  phone         VARCHAR(30)  NULL,
  party_size    INT          NOT NULL DEFAULT 2,
  table_id      INT          NULL,
  reserved_at   DATETIME     NOT NULL,
  status        ENUM('pending','confirmed','seated','cancelled','no_show') NOT NULL DEFAULT 'pending',
  notes         TEXT         NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_branch_date (branch_id, reserved_at)
);

-- Domicilios y tipo de pedido: se extiende la tabla orders.
ALTER TABLE orders
  ADD COLUMN order_type       ENUM('dine_in','takeaway','delivery') NOT NULL DEFAULT 'dine_in' AFTER table_name,
  ADD COLUMN customer_id      INT  NULL AFTER order_type,
  ADD COLUMN delivery_address TEXT NULL AFTER customer_id,
  ADD COLUMN delivery_status  ENUM('pending','assigned','on_route','delivered','cancelled') NULL AFTER delivery_address,
  ADD COLUMN driver_id        INT  NULL AFTER delivery_status,
  ADD INDEX idx_customer (customer_id),
  ADD INDEX idx_delivery (delivery_status);

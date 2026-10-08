-- RestaurOS — Migración idempotente: recepción parcial de compras y
-- transferencias entre almacenes.
-- Fase 3 del módulo de Inventarios avanzado: base de datos únicamente.
-- Sin FOREIGN KEY nueva (patrón desde la migración 25). Segura de ejecutar
-- varias veces. Ejecutar sobre tallerch_restauros.

-- ── 1. purchase_order_items.received_quantity — acumulado recibido ──────────
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_order_items' AND COLUMN_NAME = 'received_quantity');
SET @sql := IF(@col = 0,
  "ALTER TABLE purchase_order_items ADD COLUMN received_quantity DECIMAL(12,3) NOT NULL DEFAULT 0 AFTER quantity",
  "SELECT 'purchase_order_items.received_quantity ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 2. purchase_orders.status — agrega 'partially_received' ─────────────────
ALTER TABLE purchase_orders MODIFY COLUMN status
  ENUM('pending','partially_received','received','cancelled') NOT NULL DEFAULT 'pending';

-- ── 3. Transferencias entre almacenes ────────────────────────────────────────
-- No incrementa el almacén destino hasta que se confirma la recepción
-- (handleReceiveTransfer en inventory_transfers.php).
CREATE TABLE IF NOT EXISTS inventory_transfers (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  branch_id          INT           NOT NULL,
  from_warehouse_id  INT           NOT NULL,
  to_warehouse_id    INT           NOT NULL,
  status             ENUM('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
  notes              TEXT          NULL,
  requested_by       INT           NULL,
  received_by        INT           NULL,
  created_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  received_at        DATETIME      NULL,
  INDEX idx_branch (branch_id),
  INDEX idx_from (from_warehouse_id),
  INDEX idx_to (to_warehouse_id)
);

CREATE TABLE IF NOT EXISTS inventory_transfer_items (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  transfer_id       INT           NOT NULL,
  inventory_item_id INT           NOT NULL,
  quantity          DECIMAL(12,3) NOT NULL,
  INDEX idx_transfer (transfer_id)
);

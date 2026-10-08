-- RestaurOS — Migración: Cuenta Dividida (Split Bill)
-- Permite dividir una orden en varias divisiones cobrables de forma
-- independiente (por productos, por personas, por monto o por comensal).
-- La división es una capa de COBRO: no altera la orden ni la comanda de cocina.
-- Ejecutar una sola vez sobre la base existente.

-- ── Divisiones de la cuenta ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_splits (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  order_id    INT          NOT NULL,
  branch_id   INT          NOT NULL,
  label       VARCHAR(80)  NOT NULL,                 -- "Cliente A", "Persona 1"…
  mode        ENUM('items','people','amount','guest') NOT NULL DEFAULT 'amount',
  subtotal    DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount    DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax         DECIMAL(10,2) NOT NULL DEFAULT 0,      -- IVA contenido (informativo)
  total       DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid        DECIMAL(10,2) NOT NULL DEFAULT 0,
  status      ENUM('pending','paid','cancelled') NOT NULL DEFAULT 'pending',
  sort_order  INT          NOT NULL DEFAULT 0,
  created_by  INT          NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at     TIMESTAMP    NULL,
  INDEX idx_order  (order_id),
  INDEX idx_branch (branch_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Asignación de ítems (o fracciones de cantidad) a una división. Solo se usa en
-- modos 'items' y 'guest'; sirve para trazabilidad y para el recibo por persona.
CREATE TABLE IF NOT EXISTS order_split_items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  split_id      INT NOT NULL,
  order_item_id INT NOT NULL,
  quantity      INT NOT NULL DEFAULT 1,
  INDEX idx_split (split_id),
  INDEX idx_item  (order_item_id),
  FOREIGN KEY (split_id)      REFERENCES order_splits(id) ON DELETE CASCADE,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id)  ON DELETE CASCADE
);

-- Liga cada pago con su división (NULL = pago de la cuenta completa, sin dividir).
-- Idempotente: el loop de deploy ejecuta todas las migraciones en cada release,
-- así que sólo agrega la columna/índice si aún no existen (segura de repetir).
SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_payments' AND COLUMN_NAME = 'split_id'
);
SET @sql := IF(@has_col = 0,
  'ALTER TABLE order_payments ADD COLUMN split_id INT NULL AFTER order_id, ADD INDEX idx_split (split_id)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

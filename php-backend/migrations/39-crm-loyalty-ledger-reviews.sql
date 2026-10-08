-- RestaurOS — Migración idempotente: ledger de puntos/monedero, segmentación
-- de clientes y opiniones (Fase 6: CRM/Fidelización/Opiniones).
-- Sin FOREIGN KEY nueva (patrón desde la migración 25). Segura de ejecutar
-- varias veces. Ejecutar sobre tallerch_restauros.

-- ── 1. customers.last_order_at — para segmentar activos/inactivos ───────────
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'last_order_at');
SET @sql := IF(@col = 0,
  "ALTER TABLE customers ADD COLUMN last_order_at DATETIME NULL AFTER visits",
  "SELECT 'customers.last_order_at ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 2. Ledger inmutable de puntos y monedero ─────────────────────────────────
-- `customers.points`/`wallet_balance` siguen siendo el saldo vigente (lo que
-- ya lee el POS); esta tabla es el historial de CADA movimiento que los formó,
-- para poder auditar de dónde salió el saldo — igual que el kardex de inventario.
CREATE TABLE IF NOT EXISTS customer_ledger_entries (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  customer_id   INT           NOT NULL,
  branch_id     INT           NOT NULL,
  kind          ENUM('points_earned','points_adjustment','wallet_credit','wallet_debit') NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,   -- puntos o pesos según `kind`; siempre positivo, el signo lo da `kind`
  balance_after DECIMAL(10,2) NOT NULL,
  reason        VARCHAR(200)  NULL,
  ref_type      VARCHAR(20)   NULL,       -- 'order' | 'manual' | ...
  ref_id        INT           NULL,
  created_by    INT           NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_customer (customer_id),
  INDEX idx_branch (branch_id)
);

-- ── 3. Opiniones de clientes ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_reviews (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  branch_id        INT          NOT NULL,
  order_id         INT          NULL,
  customer_id      INT          NULL,
  rating           TINYINT      NOT NULL,  -- 1-5, calificación general
  food_rating      TINYINT      NULL,
  service_rating   TINYINT      NULL,
  delivery_rating  TINYINT      NULL,
  comment          TEXT         NULL,
  created_by       INT          NULL,      -- usuario que capturó la opinión (staff)
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_branch (branch_id),
  INDEX idx_order (order_id)
);

-- RestaurOS — Migración idempotente: zonas de entrega, estado/vehículo de
-- repartidores y bitácora de estados de entrega.
-- Fase 5 (Delivery propio) del roadmap omnicanal. Sin FOREIGN KEY nueva
-- (patrón desde la migración 25). Segura de ejecutar varias veces.
-- Ejecutar sobre tallerch_restauros.

-- ── 1. Zonas de entrega ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_zones (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  branch_id          INT           NOT NULL,
  name               VARCHAR(100)  NOT NULL,
  cost               DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_order          DECIMAL(10,2) NOT NULL DEFAULT 0,
  estimated_minutes  INT           NULL,
  active             TINYINT(1)    NOT NULL DEFAULT 1,
  created_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_branch (branch_id)
);

-- ── 2. drivers: disponibilidad y vehículo ────────────────────────────────────
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'drivers' AND COLUMN_NAME = 'status');
SET @sql := IF(@col = 0,
  "ALTER TABLE drivers ADD COLUMN status ENUM('disponible','en_ruta','fuera_de_servicio') NOT NULL DEFAULT 'disponible' AFTER phone",
  "SELECT 'drivers.status ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'drivers' AND COLUMN_NAME = 'vehicle');
SET @sql := IF(@col = 0,
  "ALTER TABLE drivers ADD COLUMN vehicle VARCHAR(60) NULL AFTER status",
  "SELECT 'drivers.vehicle ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 3. Bitácora de estados de entrega (una fila por transición) ─────────────
CREATE TABLE IF NOT EXISTS order_delivery_events (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  order_id   INT          NOT NULL,
  branch_id  INT          NOT NULL,
  status     VARCHAR(20)  NOT NULL,
  driver_id  INT          NULL,
  note       VARCHAR(200) NULL,
  created_by INT          NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order (order_id)
);

-- RestaurOS — Migración idempotente: pedidos editables + estado por ítem
-- Fase 2: mesas editables y estados de cocina por producto.
-- Segura de ejecutar varias veces. Ejecutar sobre tallerch_restauros.

-- ── 1. order_items.status (estado del ítem, independiente de la estación) ────
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'status');
SET @sql := IF(@col = 0,
  "ALTER TABLE order_items ADD COLUMN status ENUM('pending','preparing','completed','cancelled') NOT NULL DEFAULT 'pending' AFTER item_notes",
  "SELECT 'order_items.status ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 2. order_items.created_at (para detectar ítems NUEVOS agregados a la mesa) ─
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'created_at');
SET @sql := IF(@col = 0,
  "ALTER TABLE order_items ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER status",
  "SELECT 'order_items.created_at ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 3. order_items.completed_at ─────────────────────────────────────────────
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'completed_at');
SET @sql := IF(@col = 0,
  "ALTER TABLE order_items ADD COLUMN completed_at DATETIME NULL DEFAULT NULL AFTER created_at",
  "SELECT 'order_items.completed_at ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 4. order_items.cancel_reason ────────────────────────────────────────────
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'cancel_reason');
SET @sql := IF(@col = 0,
  "ALTER TABLE order_items ADD COLUMN cancel_reason VARCHAR(255) NULL DEFAULT NULL AFTER completed_at",
  "SELECT 'order_items.cancel_reason ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 5. order_items.created_by (mesero/usuario que agregó el ítem) ────────────
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'created_by');
SET @sql := IF(@col = 0,
  "ALTER TABLE order_items ADD COLUMN created_by INT NULL DEFAULT NULL AFTER cancel_reason",
  "SELECT 'order_items.created_by ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 6. Extender el ENUM de order_item_station_status para incluir 'cancelled' ─
-- (Permite sacar de la pantalla de cocina los ítems cancelados.)
SET @enum := (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_item_station_status' AND COLUMN_NAME = 'status');
SET @sql := IF(@enum IS NOT NULL AND LOCATE('cancelled', @enum) = 0,
  "ALTER TABLE order_item_station_status MODIFY COLUMN status ENUM('pending','preparing','ready','cancelled') NOT NULL DEFAULT 'pending'",
  "SELECT 'order_item_station_status.status ya soporta cancelled'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 7. Índice para consultar ítems por estado dentro de una orden ───────────
SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND INDEX_NAME = 'idx_order_status');
SET @sql := IF(@idx = 0,
  "ALTER TABLE order_items ADD INDEX idx_order_status (order_id, status)",
  "SELECT 'order_items.idx_order_status ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

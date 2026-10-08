-- RestaurOS — Migración idempotente: precio abierto / por KG, PIN de acceso,
-- asignación/renombrado de dispositivos.
-- Segura de ejecutar varias veces. Ejecutar sobre tallerch_restauros.

-- ── 1. products.price_type (fixed | open | kg | variable) ────────────────────
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'price_type');
SET @sql := IF(@col = 0,
  "ALTER TABLE products ADD COLUMN price_type ENUM('fixed','open','kg','variable') NOT NULL DEFAULT 'fixed' AFTER price",
  "SELECT 'products.price_type ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 2. products.price_per_kg (precio base por kilo, opcional) ────────────────
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'price_per_kg');
SET @sql := IF(@col = 0,
  "ALTER TABLE products ADD COLUMN price_per_kg DECIMAL(10,2) NULL DEFAULT NULL AFTER price_type",
  "SELECT 'products.price_per_kg ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 3. order_items: peso y precio por kg para líneas variables ──────────────
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'weight_kg');
SET @sql := IF(@col = 0,
  "ALTER TABLE order_items ADD COLUMN weight_kg DECIMAL(10,3) NULL DEFAULT NULL AFTER unit_price",
  "SELECT 'order_items.weight_kg ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'price_per_kg');
SET @sql := IF(@col = 0,
  "ALTER TABLE order_items ADD COLUMN price_per_kg DECIMAL(10,2) NULL DEFAULT NULL AFTER weight_kg",
  "SELECT 'order_items.price_per_kg ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- price_pending: línea por KG con precio estimado pendiente de confirmar
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'price_pending');
SET @sql := IF(@col = 0,
  "ALTER TABLE order_items ADD COLUMN price_pending TINYINT(1) NOT NULL DEFAULT 0 AFTER price_per_kg",
  "SELECT 'order_items.price_pending ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 4. users: PIN de acceso rápido (hash) + bloqueo por intentos ─────────────
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'pin_hash');
SET @sql := IF(@col = 0,
  "ALTER TABLE users ADD COLUMN pin_hash VARCHAR(255) NULL DEFAULT NULL AFTER password",
  "SELECT 'users.pin_hash ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'pin_attempts');
SET @sql := IF(@col = 0,
  "ALTER TABLE users ADD COLUMN pin_attempts INT NOT NULL DEFAULT 0 AFTER pin_hash",
  "SELECT 'users.pin_attempts ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'pin_locked_until');
SET @sql := IF(@col = 0,
  "ALTER TABLE users ADD COLUMN pin_locked_until DATETIME NULL DEFAULT NULL AFTER pin_attempts",
  "SELECT 'users.pin_locked_until ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 5. devices: usuario asignado y rol del dispositivo ──────────────────────
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'devices' AND COLUMN_NAME = 'assigned_user_id');
SET @sql := IF(@col = 0,
  "ALTER TABLE devices ADD COLUMN assigned_user_id INT NULL DEFAULT NULL AFTER name",
  "SELECT 'devices.assigned_user_id ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'devices' AND COLUMN_NAME = 'device_role');
SET @sql := IF(@col = 0,
  "ALTER TABLE devices ADD COLUMN device_role VARCHAR(30) NULL DEFAULT NULL AFTER assigned_user_id",
  "SELECT 'devices.device_role ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

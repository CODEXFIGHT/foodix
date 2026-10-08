-- RestaurOS — Migración idempotente: unidades con conversión, almacenes y kardex extendido.
-- Fase 1 del módulo de Inventarios avanzado: base de datos únicamente.
-- Aditivo y retrocompatible: inventory_items.stock sigue siendo el total agregado
-- que ya usa el POS (deductRecipeStock, orders.php); warehouse_stocks es una capa
-- opcional que se activa por insumo al asignarle un default_warehouse_id.
-- Sin FOREIGN KEY (patrón desde la migración 25 — hosting compartido no siempre
-- admite InnoDB referenciando estas tablas). Integridad por índice + app.
-- Segura de ejecutar varias veces. Ejecutar sobre tallerch_restauros.

-- ── 1. Catálogo global de unidades de medida ─────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_units (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  code       VARCHAR(20)  NOT NULL,
  name       VARCHAR(60)  NOT NULL,
  active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_unit_code (code)
);

INSERT IGNORE INTO inventory_units (code, name) VALUES
  ('kg', 'Kilogramo'), ('g', 'Gramo'), ('l', 'Litro'), ('ml', 'Mililitro'),
  ('pza', 'Pieza'), ('caja', 'Caja'), ('paquete', 'Paquete'), ('botella', 'Botella'),
  ('lata', 'Lata'), ('porcion', 'Porción');

-- ── 2. Almacenes por sucursal ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_warehouses (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  branch_id  INT          NOT NULL,
  name       VARCHAR(80)  NOT NULL,
  type       ENUM('principal','cocina','barra','refrigerador','congelador','seco','personalizado')
             NOT NULL DEFAULT 'personalizado',
  active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_branch (branch_id)
);

-- ── 3. Existencia por almacén (capa opcional sobre inventory_items.stock) ────
CREATE TABLE IF NOT EXISTS inventory_warehouse_stocks (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id      INT           NOT NULL,
  inventory_item_id INT           NOT NULL,
  stock             DECIMAL(12,3) NOT NULL DEFAULT 0,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_warehouse_item (warehouse_id, inventory_item_id),
  INDEX idx_item (inventory_item_id)
);

-- ── 4. inventory_items: unidad de compra, factor de conversión, almacén por defecto, SKU ──
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory_items' AND COLUMN_NAME = 'sku');
SET @sql := IF(@col = 0,
  "ALTER TABLE inventory_items ADD COLUMN sku VARCHAR(40) NULL AFTER name",
  "SELECT 'inventory_items.sku ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory_items' AND COLUMN_NAME = 'purchase_unit');
SET @sql := IF(@col = 0,
  "ALTER TABLE inventory_items ADD COLUMN purchase_unit VARCHAR(20) NULL AFTER unit",
  "SELECT 'inventory_items.purchase_unit ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory_items' AND COLUMN_NAME = 'purchase_to_base_factor');
SET @sql := IF(@col = 0,
  "ALTER TABLE inventory_items ADD COLUMN purchase_to_base_factor DECIMAL(12,4) NOT NULL DEFAULT 1 AFTER purchase_unit",
  "SELECT 'inventory_items.purchase_to_base_factor ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory_items' AND COLUMN_NAME = 'default_warehouse_id');
SET @sql := IF(@col = 0,
  "ALTER TABLE inventory_items ADD COLUMN default_warehouse_id INT NULL AFTER cost",
  "SELECT 'inventory_items.default_warehouse_id ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 5. inventory_movements: kardex ampliado (tipos, almacén, trazabilidad de costo) ──
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory_movements' AND COLUMN_NAME = 'warehouse_id');
SET @sql := IF(@col = 0,
  "ALTER TABLE inventory_movements ADD COLUMN warehouse_id INT NULL AFTER inventory_item_id",
  "SELECT 'inventory_movements.warehouse_id ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory_movements' AND COLUMN_NAME = 'previous_qty');
SET @sql := IF(@col = 0,
  "ALTER TABLE inventory_movements ADD COLUMN previous_qty DECIMAL(12,3) NULL AFTER quantity",
  "SELECT 'inventory_movements.previous_qty ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory_movements' AND COLUMN_NAME = 'resulting_qty');
SET @sql := IF(@col = 0,
  "ALTER TABLE inventory_movements ADD COLUMN resulting_qty DECIMAL(12,3) NULL AFTER previous_qty",
  "SELECT 'inventory_movements.resulting_qty ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory_movements' AND COLUMN_NAME = 'unit_cost');
SET @sql := IF(@col = 0,
  "ALTER TABLE inventory_movements ADD COLUMN unit_cost DECIMAL(10,2) NULL AFTER resulting_qty",
  "SELECT 'inventory_movements.unit_cost ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory_movements' AND COLUMN_NAME = 'total_cost');
SET @sql := IF(@col = 0,
  "ALTER TABLE inventory_movements ADD COLUMN total_cost DECIMAL(12,2) NULL AFTER unit_cost",
  "SELECT 'inventory_movements.total_cost ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Amplía el ENUM de tipos de movimiento (kardex completo). MODIFY es seguro de repetir.
ALTER TABLE inventory_movements MODIFY COLUMN type ENUM(
  'purchase','sale','waste','adjustment',
  'return','transfer_out','transfer_in','production',
  'internal_consumption','courtesy','initial','count','correction'
) NOT NULL;

-- ── 6. Un almacén "Principal" por sucursal ya existente en inventory_items ────
-- (idempotente por NOT EXISTS: no duplica si la migración corre más de una vez)
INSERT INTO inventory_warehouses (branch_id, name, type)
SELECT DISTINCT ii.branch_id, 'Principal', 'principal'
FROM inventory_items ii
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_warehouses w
  WHERE w.branch_id = ii.branch_id AND w.type = 'principal'
);

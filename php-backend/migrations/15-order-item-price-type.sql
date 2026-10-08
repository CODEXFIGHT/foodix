-- RestaurOS — Migración idempotente: tipo de precio por línea de pedido.
-- Permite a cocina y al ticket distinguir productos de precio variable / por kg
-- de los de precio fijo. Segura de ejecutar varias veces.

-- ── order_items.price_type (fixed | open | kg | variable) ────────────────────
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'price_type');
SET @sql := IF(@col = 0,
  "ALTER TABLE order_items ADD COLUMN price_type ENUM('fixed','open','kg','variable') NOT NULL DEFAULT 'fixed' AFTER unit_price",
  "SELECT 'order_items.price_type ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Backfill: las líneas existentes con precio por kg se marcan como 'kg'.
UPDATE order_items
   SET price_type = 'kg'
 WHERE price_per_kg IS NOT NULL AND price_type = 'fixed';

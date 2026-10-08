-- RestaurOS — Migración idempotente: ingredientes de producto
-- Author: Carlos Jaime López Martínez
-- Ejecutar sobre tallerch_restauros. Seguro de correr varias veces.

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'ingredients');
SET @sql := IF(@col = 0,
  "ALTER TABLE products ADD COLUMN ingredients TEXT NULL AFTER description",
  "SELECT 'products.ingredients ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

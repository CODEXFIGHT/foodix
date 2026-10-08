-- RestaurOS — Migración idempotente: cantidad de POS por establecimiento.
-- Define cuántos POS opera cada sucursal (1 o 2). Con 1 la operación
-- Caliente/Frío vive en un flujo unificado; con 2 se separa en dos estaciones
-- (POS Caliente / POS Frío). Por defecto 1.
-- Segura de ejecutar varias veces. Ejecutar DESPUÉS de 01..19.

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branches' AND COLUMN_NAME = 'pos_count');
SET @sql := IF(@col = 0,
  "ALTER TABLE branches ADD COLUMN pos_count TINYINT NOT NULL DEFAULT 1 AFTER active",
  "SELECT 'branches.pos_count ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- RestaurOS — Migración idempotente: grupo de menú por categoría.
-- Permite agrupar las categorías de la carta en "Alimentos" y "Bebidas" para
-- que el comensal navegue por pestañas de alto nivel. Por defecto 'alimento'.
-- Segura de ejecutar varias veces. Ejecutar DESPUÉS de 01..14.

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'menu_group');
SET @sql := IF(@col = 0,
  "ALTER TABLE categories ADD COLUMN menu_group ENUM('alimento','bebida') NOT NULL DEFAULT 'alimento' AFTER station",
  "SELECT 'categories.menu_group ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

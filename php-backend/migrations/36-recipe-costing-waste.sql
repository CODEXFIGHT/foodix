-- RestaurOS — Migración idempotente: costeo de recetas, merma estimada y
-- reversión idempotente de inventario en cancelaciones.
-- Fase 2 del módulo de Inventarios avanzado: base de datos únicamente.
-- Sin FOREIGN KEY nueva (patrón desde la migración 25). Segura de ejecutar
-- varias veces. Ejecutar sobre tallerch_restauros.

-- ── 1. recipe_items.waste_percent — merma estimada de preparación (%) ────────
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recipe_items' AND COLUMN_NAME = 'waste_percent');
SET @sql := IF(@col = 0,
  "ALTER TABLE recipe_items ADD COLUMN waste_percent DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER quantity",
  "SELECT 'recipe_items.waste_percent ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 2. order_items.inventory_reverted_at — marca de reversión (idempotencia) ─
-- Se reclama con UPDATE ... WHERE inventory_reverted_at IS NULL antes de
-- revertir/mermar el inventario de un ítem cancelado: si el UPDATE afecta 0
-- filas, ya se revirtió antes (reintento de API) y no se vuelve a tocar stock.
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'inventory_reverted_at');
SET @sql := IF(@col = 0,
  "ALTER TABLE order_items ADD COLUMN inventory_reverted_at DATETIME NULL AFTER cancel_reason",
  "SELECT 'order_items.inventory_reverted_at ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

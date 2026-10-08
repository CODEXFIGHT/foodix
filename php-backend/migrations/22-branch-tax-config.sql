-- RestaurOS — Migración idempotente: configuración de IVA por sucursal.
-- Permite activar/desactivar el desglose de IVA y definir la tasa por sucursal.
-- El IVA va INCLUIDO en el precio: desactivarlo NO cambia el total, solo oculta
-- la línea informativa "IVA incluido" en pantallas y tickets.
-- Segura de ejecutar varias veces. Ejecutar sobre tallerch_restauros.

-- ── 1. branches.tax_enabled (1 = mostrar IVA, 0 = ocultar) ───────────────────
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branches' AND COLUMN_NAME = 'tax_enabled');
SET @sql := IF(@col = 0,
  "ALTER TABLE branches ADD COLUMN tax_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER pos_count",
  "SELECT 'branches.tax_enabled ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 2. branches.tax_rate (porcentaje de IVA, ej. 16.00) ──────────────────────
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branches' AND COLUMN_NAME = 'tax_rate');
SET @sql := IF(@col = 0,
  "ALTER TABLE branches ADD COLUMN tax_rate DECIMAL(5,2) NOT NULL DEFAULT 16.00 AFTER tax_enabled",
  "SELECT 'branches.tax_rate ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

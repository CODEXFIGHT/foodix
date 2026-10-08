-- RestaurOS — Migración idempotente: persiste `menu_page` en wa_sessions.
-- Mismo motivo que `pending_product` (migración 27): el cursor de paginación
-- del menú ("ver más") solo vivía en el Map de proceso, y en serverless se
-- perdía entre invocaciones — "ver más" volvía a mostrar siempre la página 1.
-- Segura de ejecutar varias veces. Ejecutar sobre tallerch_restauros.
USE tallerch_restauros;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wa_sessions' AND COLUMN_NAME = 'menu_page');
SET @sql := IF(@col = 0,
  "ALTER TABLE wa_sessions ADD COLUMN menu_page TINYINT NOT NULL DEFAULT 0 AFTER pending_product",
  "SELECT 'wa_sessions.menu_page ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

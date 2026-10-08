-- RestaurOS — Migración idempotente: persiste el estado "entregado" de un
-- platillo en el KDS (antes era solo un estado local del navegador, se
-- perdía al recargar la pantalla y no se sincronizaba entre dispositivos).
-- Ejecutar sobre tallerch_restauros. Segura de correr varias veces.

SET @enum := (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_item_station_status' AND COLUMN_NAME = 'status');
SET @sql := IF(@enum IS NOT NULL AND LOCATE('delivered', @enum) = 0,
  "ALTER TABLE order_item_station_status MODIFY COLUMN status ENUM('pending','preparing','ready','delivered','cancelled') NOT NULL DEFAULT 'pending'",
  "SELECT 'order_item_station_status.status ya soporta delivered'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- RestaurOS — Migración idempotente: tipo de pedido por defecto para WhatsApp.
-- Elimina la pregunta "¿mesa/llevar/domicilio?" del bot: el tipo de entrega
-- ahora se define una sola vez por sucursal desde Ajustes.
-- Segura de ejecutar varias veces. Ejecutar sobre tallerch_restauros.
USE tallerch_restauros;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branches' AND COLUMN_NAME = 'wa_default_order_type');
SET @sql := IF(@col = 0,
  "ALTER TABLE branches ADD COLUMN wa_default_order_type ENUM('pickup','delivery') NOT NULL DEFAULT 'pickup' AFTER tax_rate",
  "SELECT 'branches.wa_default_order_type ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

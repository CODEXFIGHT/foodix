-- RestaurOS — Migración idempotente: dedupe de reintentos de webhook WhatsApp.
-- Los proveedores (sobre todo Twilio) reintentan el webhook si la respuesta
-- tarda; sin esto, un reintento reprocesaba el mensaje completo y podía
-- generar un pedido duplicado. Guarda el id de mensaje del proveedor y
-- rechaza duplicados por (branch_id, provider_message_id).
-- Segura de ejecutar varias veces. Ejecutar sobre tallerch_restauros.
USE tallerch_restauros;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wa_messages' AND COLUMN_NAME = 'provider_message_id');
SET @sql := IF(@col = 0,
  "ALTER TABLE wa_messages ADD COLUMN provider_message_id VARCHAR(64) NULL AFTER direction",
  "SELECT 'wa_messages.provider_message_id ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wa_messages' AND INDEX_NAME = 'uniq_wa_msg_provider_id');
SET @sql := IF(@idx = 0,
  "ALTER TABLE wa_messages ADD UNIQUE KEY uniq_wa_msg_provider_id (branch_id, provider_message_id)",
  "SELECT 'uniq_wa_msg_provider_id ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- RestaurOS — Migración: ciclo de vida de sesión WhatsApp (pausa/recuperación + aviso de inactividad)
--
-- Antes de esta migración, al pasar el TTL de inactividad
-- (WHATSAPP_SESSION_TTL_MINUTES) el bot descartaba la sesión completa y el
-- cliente perdía el carrito sin darse cuenta al volver a escribir. Con esto:
--
--   · awaiting_resume  — marca que le mostramos al cliente el mensaje de
--     "dejaste un pedido en progreso, ¿continuar/cancelar/ver menú?" y
--     estamos esperando su decisión antes de seguir con el flujo normal.
--   · last_notified_at — última vez que el cron de inactividad le mandó el
--     recordatorio "¿sigues ahí?", para no repetirlo en cada corrida. NO se
--     actualiza junto con last_activity (el aviso automático no cuenta como
--     actividad real del cliente).
--
-- Ejecutar una sola vez (mismo esquema que 25-whatsapp.sql / 27). Si las
-- columnas ya existen, el ALTER falla con "Duplicate column" — no pasa nada,
-- ya está aplicada.
USE tallerch_restauros;

ALTER TABLE wa_sessions
  ADD COLUMN awaiting_resume TINYINT(1) NOT NULL DEFAULT 0 AFTER pending_product,
  ADD COLUMN last_notified_at DATETIME NULL AFTER last_activity;

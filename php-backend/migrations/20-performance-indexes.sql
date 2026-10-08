-- RestaurOS — Índices de rendimiento para alta concurrencia (KDS y listados)
-- Idempotente: solo crea cada índice si aún no existe. Seguro de re-ejecutar.
-- Ejecutar sobre tallerch_restauros.
--
-- Motivación: el endpoint /stations/{station}/orders se pollea cada 2 s por cada
-- pantalla de cocina. Su consulta filtra orders por (branch_id, status) y ordena
-- por created_at, y luego cruza order_item_station_status por (order_id, station,
-- status). Estos índices convierten esos escaneos en búsquedas por índice.

-- ── 1. orders(branch_id, status, created_at) ────────────────────────────────
-- Cubre el WHERE o.branch_id = ? AND o.status IN (...) ORDER BY o.created_at.
-- Evita el filesort y el escaneo por estado del KDS y de los listados de POS.
SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
    AND INDEX_NAME = 'idx_branch_status_created');
SET @sql := IF(@idx = 0,
  "ALTER TABLE orders ADD INDEX idx_branch_status_created (branch_id, status, created_at)",
  "SELECT 'orders.idx_branch_status_created ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 2. order_item_station_status(order_id, station, status) ──────────────────
-- Extiende idx_order_station con status: el join del KDS filtra por estación y
-- luego por status (pending/preparing/cancelled). Lee solo las filas relevantes.
SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_item_station_status'
    AND INDEX_NAME = 'idx_order_station_status');
SET @sql := IF(@idx = 0,
  "ALTER TABLE order_item_station_status ADD INDEX idx_order_station_status (order_id, station, status)",
  "SELECT 'oiss.idx_order_station_status ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 3. order_item_station_status(station, status, updated_at) ────────────────
-- Sirve la alerta de cancelaciones recientes (status='cancelled' AND updated_at >
-- NOW()-INTERVAL 3 MINUTE) y futuras consultas por estación sin filtrar orden.
SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_item_station_status'
    AND INDEX_NAME = 'idx_station_status_updated');
SET @sql := IF(@idx = 0,
  "ALTER TABLE order_item_station_status ADD INDEX idx_station_status_updated (station, status, updated_at)",
  "SELECT 'oiss.idx_station_status_updated ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

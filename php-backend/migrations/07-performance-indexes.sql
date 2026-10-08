-- RestaurOS — Migración: índices de rendimiento
-- Acelera las consultas más frecuentes (listado de pedidos en vivo y reportes
-- de ventas por rango de fecha). Idempotente: si el índice ya existe, MySQL
-- lanza error solo en esa línea; ignórala al re-ejecutar.
-- Correr DESPUÉS de 01..06.
USE tallerch_restauros;

-- Pedidos: filtros típicos son branch_id + status + orden/rango por created_at.
-- Cubre tanto GET /orders (lista en vivo) como los reportes de /sales.
ALTER TABLE orders
  ADD INDEX idx_branch_status_created (branch_id, status, created_at);

-- order_items se consulta por lote con WHERE order_id IN (...). Ya existe
-- idx_order (order_id); se deja documentado por claridad.
-- ALTER TABLE order_items ADD INDEX idx_order (order_id);

-- Pagos de suscripción: consultas por sucursal/estado en el panel SaaS.
-- (La tabla la crea la migración 05; estos índices ya vienen en su DDL.)

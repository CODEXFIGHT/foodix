-- RestaurOS — Migración: Caja por turno de cajero (usuario + POS)
-- Convierte la sesión de caja de "una por sucursal" a "un turno de un cajero
-- en un POS concreto". Permite varias cajas abiertas a la vez en la misma
-- sucursal (una por POS) y deja trazabilidad obligatoria en ventas y pagos.
USE tallerch_restauros;

-- ── cash_sessions: a qué POS y con qué rol se abrió/cerró el turno ──
ALTER TABLE cash_sessions
  ADD COLUMN pos_id      INT         NULL AFTER branch_id,
  ADD COLUMN opened_role VARCHAR(40) NULL AFTER opened_by,
  ADD COLUMN closed_role VARCHAR(40) NULL AFTER closed_by;

-- Resolver la caja abierta de un POS es la operación más caliente (cada cobro).
ALTER TABLE cash_sessions
  ADD INDEX idx_branch_pos_status (branch_id, pos_id, status);

-- ── order_payments: además de la sesión, en qué POS se cobró ──
ALTER TABLE order_payments
  ADD COLUMN pos_id INT NULL AFTER cash_session_id;

-- ── orders: trazabilidad de la caja/POS bajo la que se operó el pedido ──
-- NULLable: un mesero puede crear el pedido antes de que el cajero cobre; el
-- vínculo obligatorio se exige al cobrar (order_payments.cash_session_id).
ALTER TABLE orders
  ADD COLUMN cash_session_id INT NULL AFTER branch_id,
  ADD COLUMN pos_id          INT NULL AFTER cash_session_id,
  ADD INDEX idx_cash_session (cash_session_id);

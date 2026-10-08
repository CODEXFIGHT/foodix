-- RestaurOS — Migración: Caja y Turnos
-- Apertura/cierre de caja, cortes X/Z, arqueo y movimientos de efectivo.
USE tallerch_restauros;

-- Una sesión de caja = un turno de un cajero (desde apertura hasta cierre).
CREATE TABLE IF NOT EXISTS cash_sessions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  branch_id       INT           NOT NULL,
  opened_by       INT           NULL,
  closed_by       INT           NULL,
  opening_amount  DECIMAL(10,2) NOT NULL DEFAULT 0,  -- fondo inicial
  closing_amount  DECIMAL(10,2) NULL,                -- efectivo contado al cerrar
  expected_amount DECIMAL(10,2) NULL,                -- efectivo que debería haber
  difference      DECIMAL(10,2) NULL,                -- contado - esperado
  status          ENUM('open','closed') NOT NULL DEFAULT 'open',
  notes           TEXT          NULL,
  opened_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at       DATETIME      NULL,
  INDEX idx_branch_status (branch_id, status)
);

-- Entradas/salidas de efectivo ajenas a ventas (fondo, retiros, gastos…).
CREATE TABLE IF NOT EXISTS cash_movements (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  session_id  INT           NOT NULL,
  branch_id   INT           NOT NULL,
  type        ENUM('in','out') NOT NULL,
  amount      DECIMAL(10,2) NOT NULL,
  reason      VARCHAR(200)  NULL,
  created_by  INT           NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session (session_id),
  FOREIGN KEY (session_id) REFERENCES cash_sessions(id) ON DELETE CASCADE
);

-- Vincula cada pago con la sesión de caja abierta al momento del cobro.
ALTER TABLE order_payments
  ADD COLUMN cash_session_id INT NULL AFTER branch_id,
  ADD INDEX idx_session (cash_session_id);

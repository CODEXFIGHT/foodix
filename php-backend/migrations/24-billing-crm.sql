-- RestaurOS — Migración: Billing CRM (Fase 1 · fundación backend)
-- Convierte el módulo de Suscripciones en un CRM de facturación:
--   · pagos con "meses cubiertos" (soporta pagos adelantados multi-mes)
--   · calendario mensual cacheado (híbrido: la verdad vive en los pagos)
--   · renovación anclada al día 1 + periodo de gracia configurable
-- Correr DESPUÉS de 05-saas-billing.sql. Cada ADD COLUMN es independiente:
-- si una columna ya existe, omite solo esa línea al re-ejecutar.
USE tallerch_restauros;

-- ── 1) Pagos: meses cubiertos, métodos ampliados y metadatos ────────────────────
-- Métodos que pide el Billing CRM (transferencia, SPEI, efectivo, tarjeta,
-- Mercado Pago, Stripe, otro). Se conserva 'bank_transfer' por compatibilidad.
ALTER TABLE subscription_payments
  MODIFY COLUMN payment_method ENUM(
    'card','bank_transfer','spei','cash','transfer','mercado_pago','stripe','other'
  ) NOT NULL DEFAULT 'transfer';

-- Rango de meses que cubre el pago (ancla día 1). Para un pago de 1 mes,
-- covered_from = covered_to = primer día de ese mes. months_count = nº de meses.
ALTER TABLE subscription_payments
  ADD COLUMN covered_from   DATE         NULL AFTER bank_transfer_date,
  ADD COLUMN covered_to     DATE         NULL AFTER covered_from,
  ADD COLUMN months_count   INT          NOT NULL DEFAULT 1 AFTER covered_to,
  ADD COLUMN notes          VARCHAR(500) NULL AFTER months_count,
  ADD COLUMN created_by     INT          NULL AFTER notes,
  ADD INDEX idx_covered (branch_id, covered_from, covered_to);

-- ── 2) Calendario mensual (CACHÉ híbrido) ───────────────────────────────────────
-- Una fila por (sucursal, periodo 'YYYY-MM'). Es un caché que se reconstruye
-- desde subscription_payments + estado de la suscripción (rebuildSubscriptionCalendar).
-- NO es la fuente de verdad: nunca editar a mano; siempre derivar de los pagos.
CREATE TABLE IF NOT EXISTS subscription_calendar (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  branch_id       INT          NOT NULL,
  subscription_id INT          NULL,
  period          CHAR(7)      NOT NULL,            -- 'YYYY-MM'
  status          ENUM('paid','prepaid','pending','suspended','canceled','trial','none')
                               NOT NULL DEFAULT 'none',
  payment_id      INT          NULL,                -- pago que cubrió el mes
  amount          DECIMAL(10,2) NULL,
  paid_at         DATETIME     NULL,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_branch_period (branch_id, period),
  INDEX idx_branch (branch_id),
  INDEX idx_period (period)
);

-- ── 3) Suscripción: gracia configurable y ancla de facturación ──────────────────
ALTER TABLE subscriptions
  ADD COLUMN grace_days         INT      NOT NULL DEFAULT 5 AFTER expires_at,
  ADD COLUMN billing_anchor_day TINYINT  NOT NULL DEFAULT 1 AFTER grace_days;

-- RestaurOS — Migración: Administración SaaS / Billing
-- Suscripciones por sucursal con Stripe + transferencia SPEI, pagos, auditoría.
-- Correr DESPUÉS de 01..04. Idempotente donde es posible.
USE tallerch_restauros;

-- ── 1) Ampliar tabla subscriptions ─────────────────────────────────────────────
-- Nuevos estados del ciclo de vida de la suscripción.
ALTER TABLE subscriptions
  MODIFY COLUMN status ENUM(
    'active','trial','past_due','payment_failed','pending_bank_transfer',
    'bank_transfer_review','suspended','canceled','terminated','expired'
  ) NOT NULL DEFAULT 'active';

-- Migrar el estado viejo 'cancelled' (UK) → 'canceled'. Ignorar si no existe.
UPDATE subscriptions SET status = 'canceled' WHERE status = 'cancelled';

-- Campos de billing. Cada ADD COLUMN es independiente: si una columna ya existe,
-- omite solo esa línea al re-ejecutar.
ALTER TABLE subscriptions
  ADD COLUMN price_monthly         DECIMAL(10,2)                   NOT NULL DEFAULT 0,
  ADD COLUMN currency              CHAR(3)                         NOT NULL DEFAULT 'MXN',
  ADD COLUMN payment_method        ENUM('card','bank_transfer','none') NOT NULL DEFAULT 'none',
  ADD COLUMN stripe_customer_id    VARCHAR(64)  NULL,
  ADD COLUMN stripe_subscription_id VARCHAR(64) NULL,
  ADD COLUMN stripe_price_id       VARCHAR(64)  NULL,
  ADD COLUMN cancel_at_period_end  TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN canceled_at           DATETIME     NULL,
  ADD COLUMN suspended_at          DATETIME     NULL,
  ADD COLUMN terminated_at         DATETIME     NULL,
  ADD COLUMN trial_ends_at         DATETIME     NULL,
  ADD COLUMN last_payment_at       DATETIME     NULL;

-- ── 2) Pagos de suscripción (Stripe + SPEI) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_payments (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  branch_id              INT           NOT NULL,
  subscription_id        INT           NULL,
  amount                 DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency               CHAR(3)       NOT NULL DEFAULT 'MXN',
  status                 ENUM('pending','paid','failed','rejected',
                              'pending_bank_transfer','bank_transfer_review')
                                       NOT NULL DEFAULT 'pending',
  payment_method         ENUM('card','bank_transfer') NOT NULL DEFAULT 'bank_transfer',
  stripe_invoice_id        VARCHAR(64) NULL,
  stripe_payment_intent_id VARCHAR(64) NULL,
  bank_reference         VARCHAR(80)   NULL,   -- RESTAUROS-{BRANCH_ID}-{YYYYMM}
  bank_transfer_date     DATE          NULL,
  bank_sender_name       VARCHAR(150)  NULL,
  bank_name              VARCHAR(120)  NULL,
  receipt_url            VARCHAR(500)  NULL,
  reviewed_by            INT           NULL,   -- user_id del superadmin
  reviewed_at            DATETIME      NULL,
  rejection_reason       VARCHAR(255)  NULL,
  created_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_branch (branch_id),
  INDEX idx_status (status),
  INDEX idx_stripe_invoice (stripe_invoice_id)
);

-- ── 3) Bitácora de auditoría de cambios de estado ───────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_audit_log (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  branch_id       INT          NOT NULL,
  subscription_id INT          NULL,
  action          VARCHAR(60)  NOT NULL,   -- suspend, reactivate, cancel, terminate, approve_transfer, ...
  previous_status VARCHAR(40)  NULL,
  new_status      VARCHAR(40)  NULL,
  performed_by    INT          NULL,       -- user_id que ejecutó la acción
  note            VARCHAR(255) NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_branch (branch_id)
);

-- ── 4) Configuración de transferencia bancaria (SPEI) ───────────────────────────
CREATE TABLE IF NOT EXISTS bank_transfer_config (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  bank_name        VARCHAR(120)  NOT NULL,
  clabe            VARCHAR(18)   NOT NULL,
  beneficiary_name VARCHAR(150)  NOT NULL,
  instructions     TEXT          NULL,
  amount_default   DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active        TINYINT(1)    NOT NULL DEFAULT 1,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Fila inicial de ejemplo (editar con los datos reales del dueño del SaaS).
INSERT INTO bank_transfer_config (bank_name, clabe, beneficiary_name, instructions, amount_default, is_active)
SELECT 'Ualá', '138580000012357007', 'DevHiveRestaurOS',
       'Realiza la transferencia SPEI con el concepto exacto indicado. Cuenta Ualá · Tel. 7734090058. Tu acceso se reactiva al confirmar el pago.',
       0, 1
WHERE NOT EXISTS (SELECT 1 FROM bank_transfer_config);

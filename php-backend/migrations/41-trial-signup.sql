-- RestaurOS — Migración: Registro público + Prueba gratuita de 14 días
--
-- Añade el alta autoservicio (landing/login → /register) con verificación de
-- correo y teléfono, creación automática de la sucursal (workspace) y
-- activación del trial de 14 días, más la capa antiabuso multiseñal.
--
-- Decisiones:
--   · El trial pertenece a la SUCURSAL (workspace), no al usuario: vive en
--     `subscriptions` (plan='trial', status='trial') — no se duplica el modelo.
--   · `subscriptions.trial_seq` + UNIQUE(branch_id, trial_seq) garantiza a
--     nivel de base de datos UN SOLO trial por sucursal, incluso con dos
--     peticiones simultáneas de activación (NULL no colisiona en MySQL).
--   · Los identificadores sensibles (correo, teléfono, dispositivo, IP) se
--     guardan SOLO como HMAC-SHA256 con pepper (ver config/trial_identity.php).
--   · Los OTP y los tokens de verificación se guardan hasheados, nunca en claro.
--
-- Correr DESPUÉS de 24-billing-crm.sql. Idempotente: usa INFORMATION_SCHEMA
-- antes de cada ALTER y CREATE TABLE IF NOT EXISTS.
USE tallerch_restauros;

-- ── Helper de idempotencia ────────────────────────────────────────────────────
DELIMITER //
DROP PROCEDURE IF EXISTS ros_add_column //
CREATE PROCEDURE ros_add_column(IN tbl VARCHAR(64), IN col VARCHAR(64), IN ddl TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
  ) THEN
    SET @s = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN ', ddl);
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END //

DROP PROCEDURE IF EXISTS ros_add_index //
CREATE PROCEDURE ros_add_index(IN tbl VARCHAR(64), IN idx VARCHAR(64), IN ddl TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx
  ) THEN
    SET @s = CONCAT('ALTER TABLE `', tbl, '` ADD ', ddl);
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END //
DELIMITER ;

-- ── 1) Usuarios: verificación de identidad ────────────────────────────────────
CALL ros_add_column('users', 'email_verified_at', 'email_verified_at DATETIME NULL AFTER email');
CALL ros_add_column('users', 'phone',             'phone VARCHAR(20) NULL AFTER email_verified_at');
CALL ros_add_column('users', 'phone_verified_at', 'phone_verified_at DATETIME NULL AFTER phone');

-- ── 2) Sucursales (workspace): marca de trial consumido ───────────────────────
-- `trial_used_at` es la bandera histórica del workspace: una vez puesta, esa
-- sucursal NO vuelve a ser elegible para otro trial (aunque se borre el usuario,
-- se cambie el correo o se limpien cookies).
CALL ros_add_column('branches', 'trial_used_at',     'trial_used_at DATETIME NULL AFTER sessions_revoked_at');
CALL ros_add_column('branches', 'onboarding_status', "onboarding_status ENUM('pending','completed') NOT NULL DEFAULT 'completed' AFTER trial_used_at");

-- ── 3) Suscripciones: datos inmutables del trial ──────────────────────────────
CALL ros_add_column('subscriptions', 'trial_started_at', 'trial_started_at DATETIME NULL AFTER trial_ends_at');
CALL ros_add_column('subscriptions', 'trial_days',       'trial_days INT NOT NULL DEFAULT 14 AFTER trial_started_at');
CALL ros_add_column('subscriptions', 'trial_source',     "trial_source ENUM('self_signup','superadmin','import') NULL AFTER trial_days");
CALL ros_add_column('subscriptions', 'converted_at',     'converted_at DATETIME NULL AFTER trial_source');
-- 1 = fila de trial inicial. NULL en todas las demás → el UNIQUE solo aplica a
-- los trials, permitiendo múltiples suscripciones de pago por sucursal.
CALL ros_add_column('subscriptions', 'trial_seq',        'trial_seq TINYINT NULL AFTER converted_at');
CALL ros_add_index ('subscriptions', 'uniq_branch_trial', 'UNIQUE KEY uniq_branch_trial (branch_id, trial_seq)');

-- Backfill: las suscripciones que ya están en plan trial marcan su fila.
UPDATE subscriptions
   SET trial_seq = 1,
       trial_started_at = COALESCE(trial_started_at, starts_at),
       trial_source = COALESCE(trial_source, 'superadmin')
 WHERE plan = 'trial' AND trial_seq IS NULL;

-- ── 4) Registros en curso (antes de existir la sucursal) ──────────────────────
-- Un `signup` es una solicitud de alta. NO otorga acceso: solo cuando el correo
-- y el teléfono están verificados y el riesgo lo permite se crea la sucursal.
CREATE TABLE IF NOT EXISTS signups (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  session_token_hash CHAR(64)     NOT NULL,          -- handle opaco del navegador (sha256)
  first_name        VARCHAR(60)   NOT NULL,
  last_name         VARCHAR(60)   NOT NULL,
  business_name     VARCHAR(100)  NOT NULL,
  email             VARCHAR(150)  NOT NULL,          -- tal como la escribió (lowercased)
  email_hash        CHAR(64)      NOT NULL,          -- HMAC del correo canonicalizado
  phone_e164        VARCHAR(20)   NULL,
  phone_hash        CHAR(64)      NULL,
  password_hash     VARCHAR(255)  NOT NULL,
  username          VARCHAR(60)   NULL,              -- se resuelve al activar
  device_hash       CHAR(64)      NULL,
  ip_hash           CHAR(64)      NULL,
  user_agent        VARCHAR(255)  NULL,
  email_verified_at DATETIME      NULL,
  phone_verified_at DATETIME      NULL,
  status            ENUM('pending_verification','verified','activated','review','rejected')
                                  NOT NULL DEFAULT 'pending_verification',
  risk_score        INT           NOT NULL DEFAULT 0,
  risk_level        ENUM('low','medium','high','block') NOT NULL DEFAULT 'low',
  reason_code       VARCHAR(40)   NULL,
  marketing_opt_in  TINYINT(1)    NOT NULL DEFAULT 0,
  terms_accepted_at DATETIME      NULL,
  branch_id         INT           NULL,
  user_id           INT           NULL,
  expires_at        DATETIME      NOT NULL,          -- caduca si no se completa
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_session (session_token_hash),
  INDEX idx_email_hash (email_hash),
  INDEX idx_phone_hash (phone_hash),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5) Tokens de verificación de correo (un solo uso, con caducidad) ──────────
CREATE TABLE IF NOT EXISTS signup_verifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  signup_id  INT          NOT NULL,
  purpose    ENUM('email_verify') NOT NULL DEFAULT 'email_verify',
  token_hash CHAR(64)     NOT NULL,
  expires_at DATETIME     NOT NULL,
  used_at    DATETIME     NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_token (token_hash),
  INDEX idx_signup (signup_id),
  CONSTRAINT fk_verif_signup FOREIGN KEY (signup_id) REFERENCES signups(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 6) Códigos de verificación (hasheados) ────────────────────────────────────
-- Canal único: correo electrónico. El sistema NO envía SMS ni WhatsApp.
CREATE TABLE IF NOT EXISTS signup_otp_codes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  signup_id   INT          NOT NULL,
  phone_hash  CHAR(64)     NOT NULL,
  code_hash   CHAR(64)     NOT NULL,             -- HMAC del código, nunca en claro
  channel     ENUM('email') NOT NULL DEFAULT 'email',
  attempts    TINYINT      NOT NULL DEFAULT 0,
  expires_at  DATETIME     NOT NULL,
  verified_at DATETIME     NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_signup (signup_id),
  INDEX idx_phone (phone_hash),
  CONSTRAINT fk_otp_signup FOREIGN KEY (signup_id) REFERENCES signups(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 7) Historial de identidades que YA consumieron un trial ───────────────────
-- Fuente de verdad del antiabuso: si una identidad verificada (correo, teléfono,
-- método de pago) aparece aquí, no hay segundo trial automático.
-- El tipo 'device' se guarda igual pero NO bloquea por sí solo (ver trial_risk.php).
CREATE TABLE IF NOT EXISTS trial_identities (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  branch_id        INT          NOT NULL,
  user_id          INT          NULL,
  identity_type    ENUM('email','phone','device','payment_method','ip') NOT NULL,
  identity_hash    CHAR(64)     NOT NULL,
  trial_started_at DATETIME     NULL,
  trial_ended_at   DATETIME     NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_identity_branch (identity_type, identity_hash, branch_id),
  INDEX idx_lookup (identity_type, identity_hash),
  INDEX idx_branch (branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 8) Bitácora de decisiones de trial (auditoría antiabuso) ──────────────────
CREATE TABLE IF NOT EXISTS trial_attempts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  signup_id   INT          NULL,
  branch_id   INT          NULL,
  user_id     INT          NULL,
  email_hash  CHAR(64)     NULL,
  phone_hash  CHAR(64)     NULL,
  device_hash CHAR(64)     NULL,
  ip_hash     CHAR(64)     NULL,
  risk_score  INT          NOT NULL DEFAULT 0,
  risk_level  ENUM('low','medium','high','block') NOT NULL DEFAULT 'low',
  decision    ENUM('TRIAL_GRANTED','TRIAL_REJECTED','TRIAL_REVIEW','TRIAL_EXPIRED','TRIAL_CONVERTED')
                           NOT NULL,
  reason_code VARCHAR(40)  NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_decision (decision),
  INDEX idx_created (created_at),
  INDEX idx_branch (branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 9) Rate limiting genérico (ventanas por clave hasheada) ───────────────────
CREATE TABLE IF NOT EXISTS trial_rate_limits (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  scope        VARCHAR(40)  NOT NULL,     -- register_ip, otp_phone, otp_ip, ...
  key_hash     CHAR(64)     NOT NULL,
  window_start DATETIME     NOT NULL,
  hits         INT          NOT NULL DEFAULT 0,
  UNIQUE KEY uniq_bucket (scope, key_hash, window_start),
  INDEX idx_window (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 10) Auditoría de acciones administrativas sobre el trial ──────────────────
CREATE TABLE IF NOT EXISTS trial_admin_audit (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  branch_id         INT          NOT NULL,
  subscription_id   INT          NULL,
  action            VARCHAR(40)  NOT NULL,   -- extend_trial, reactivate_trial, block_trial
  previous_trial_end DATETIME    NULL,
  new_trial_end     DATETIME     NULL,
  changed_by        INT          NULL,       -- user_id del superadmin
  reason            VARCHAR(255) NULL,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_branch (branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Limpieza ──────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS ros_add_column;
DROP PROCEDURE IF EXISTS ros_add_index;

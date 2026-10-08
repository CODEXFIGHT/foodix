-- FoodIX — Schema MySQL 8
-- Ejecutar en orden para respetar foreign keys

CREATE DATABASE IF NOT EXISTS tallerch_foodix CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tallerch_foodix;

CREATE TABLE branches (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  slug       VARCHAR(60)  NOT NULL UNIQUE,
  address    TEXT,
  phone      VARCHAR(20),
  logo_url   VARCHAR(500),
  active     TINYINT(1)   NOT NULL DEFAULT 1,
  pos_count  TINYINT      NOT NULL DEFAULT 1,
  sessions_revoked_at DATETIME NULL DEFAULT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subscriptions (
  id                INT          AUTO_INCREMENT PRIMARY KEY,
  branch_id         INT          NOT NULL REFERENCES branches(id),
  plan              ENUM('trial','basic','pro','enterprise') NOT NULL DEFAULT 'trial',
  -- Estados ampliados (ver migrations/05-saas-billing.sql)
  status            ENUM('active','trial','past_due','payment_failed','pending_bank_transfer',
                         'bank_transfer_review','suspended','canceled','terminated','expired')
                                 NOT NULL DEFAULT 'active',
  starts_at         DATETIME     NOT NULL,   -- inicio del periodo vigente
  expires_at        DATETIME     NOT NULL,   -- fin del periodo vigente (renovación)
  max_devices       INT          NOT NULL DEFAULT 2,
  -- Billing
  price_monthly          DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency               CHAR(3)       NOT NULL DEFAULT 'MXN',
  payment_method         ENUM('card','bank_transfer','none') NOT NULL DEFAULT 'none',
  stripe_customer_id     VARCHAR(64)  NULL,
  stripe_subscription_id VARCHAR(64)  NULL,
  stripe_price_id        VARCHAR(64)  NULL,
  cancel_at_period_end   TINYINT(1)   NOT NULL DEFAULT 0,
  canceled_at            DATETIME     NULL,
  suspended_at           DATETIME     NULL,
  terminated_at          DATETIME     NULL,
  trial_ends_at          DATETIME     NULL,
  last_payment_at        DATETIME     NULL,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_branch (branch_id)
);

CREATE TABLE users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  branch_id  INT          REFERENCES branches(id),
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  username   VARCHAR(60)  UNIQUE,           -- identificador de acceso (login)
  password   VARCHAR(255) NOT NULL,
  role       ENUM('superadmin','admin','mesero','cocina') NOT NULL,
  active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_branch (branch_id)
);

CREATE TABLE devices (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  branch_id    INT          NOT NULL REFERENCES branches(id),
  name         VARCHAR(100) NOT NULL,
  device_type  ENUM('android','web','tablet','desktop') NOT NULL DEFAULT 'web',
  device_uid   VARCHAR(255) NOT NULL,
  status       ENUM('pending','approved','rejected','revoked') NOT NULL DEFAULT 'pending',
  last_seen_at DATETIME,
  approved_by  INT          REFERENCES users(id),
  approved_at  DATETIME,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY idx_uid_branch (device_uid, branch_id),
  INDEX idx_branch (branch_id),
  INDEX idx_uid   (device_uid)
);

CREATE TABLE categories (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  branch_id  INT         NOT NULL REFERENCES branches(id),
  name       VARCHAR(80) NOT NULL,
  emoji      VARCHAR(10),
  color      VARCHAR(7)  NOT NULL DEFAULT '#E85D04',
  menu_group ENUM('alimento','bebida') NOT NULL DEFAULT 'alimento', -- agrupación de alto nivel en la carta pública
  sort_order INT         NOT NULL DEFAULT 0,
  active     TINYINT(1)  NOT NULL DEFAULT 1,
  INDEX idx_branch (branch_id)
);

CREATE TABLE products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  branch_id   INT            NOT NULL REFERENCES branches(id),
  category_id INT            REFERENCES categories(id),
  name        VARCHAR(150)   NOT NULL,
  description TEXT,
  price       DECIMAL(10,2)  NOT NULL,
  image_url   VARCHAR(500),
  emoji       VARCHAR(10),
  barcode     VARCHAR(100),
  available   TINYINT(1)     NOT NULL DEFAULT 1,
  sort_order  INT            NOT NULL DEFAULT 0,
  modifiers_json TEXT        DEFAULT NULL,
  created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_branch   (branch_id),
  INDEX idx_category (category_id),
  INDEX idx_barcode  (barcode)
);

CREATE TABLE orders (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  branch_id    INT           NOT NULL REFERENCES branches(id),
  table_id     INT           REFERENCES tables(id),
  table_name   VARCHAR(50)   NOT NULL DEFAULT '',
  status       ENUM('pending','preparing','ready','delivered','completed','cancelled') NOT NULL DEFAULT 'pending',
  subtotal     DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax          DECIMAL(10,2) NOT NULL DEFAULT 0,
  total        DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes        TEXT,
  created_by   INT           REFERENCES users(id),
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at DATETIME,
  INDEX idx_branch (branch_id),
  INDEX idx_status (status)
);

CREATE TABLE tables (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  branch_id        INT         NOT NULL REFERENCES branches(id),
  name             VARCHAR(50) NOT NULL,
  seats            INT         NOT NULL DEFAULT 4,
  status           ENUM('libre','ocupada','reservada') NOT NULL DEFAULT 'libre',
  current_order_id INT         REFERENCES orders(id),
  qr_code          VARCHAR(500),
  INDEX idx_branch (branch_id)
);

CREATE TABLE order_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  order_id     INT           NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   INT           REFERENCES products(id),
  product_name VARCHAR(150)  NOT NULL,
  quantity     INT           NOT NULL,
  unit_price   DECIMAL(10,2) NOT NULL,
  subtotal     DECIMAL(10,2) NOT NULL,
  INDEX idx_order (order_id)
);

CREATE TABLE revoked_tokens (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME     NOT NULL,
  revoked_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hash    (token_hash),
  INDEX idx_expires (expires_at)
);

CREATE TABLE login_attempts (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  ip_address   VARCHAR(45) NOT NULL,
  attempted_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ip_time (ip_address, attempted_at)
);

-- Superadmin inicial — usuario (login): superadmin · contraseña: Admin123!
-- Cambiar inmediatamente después de la primera instalación.
INSERT INTO users (branch_id, name, email, username, password, role) VALUES
  (NULL, 'Super Admin', 'admin@foodix.app', 'superadmin',
   '$2y$12$k7M17Xa93irJR2.orjNRNeZjIgIf5hZ/KRYYggW4Grl97Mj2EEusy', 'superadmin');

-- Solicitudes de contacto / cotización desde la landing (ver migrations/18).
CREATE TABLE contact_leads (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  whatsapp    VARCHAR(40)  NOT NULL,
  message     TEXT         NOT NULL,
  status      ENUM('new','read','archived') NOT NULL DEFAULT 'new',
  source      VARCHAR(40)  NOT NULL DEFAULT 'landing',
  ip          VARCHAR(45)  NULL,
  user_agent  VARCHAR(255) NULL,
  emailed     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

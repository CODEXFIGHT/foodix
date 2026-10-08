-- RestaurOS — Migración: Promociones, combos, cupones y lealtad (Módulo 5)
-- Base de datos del módulo de crecimiento: combos vendibles, descuentos por
-- día/horario, cupones canjeables por código y reglas de recompensa por
-- frecuencia de compra ("compra X veces y recibe Y").
USE tallerch_restauros;

-- ── Promociones (descuento por día/horario/categoría/producto) ────────────────
CREATE TABLE IF NOT EXISTS promotions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  branch_id     INT NOT NULL,
  name          VARCHAR(120) NOT NULL,
  type          ENUM('discount_percent','discount_amount') NOT NULL,
  value         DECIMAL(10,2) NOT NULL,
  applies_to    ENUM('order','category','product') NOT NULL DEFAULT 'order',
  target_id     INT NULL,                 -- category_id o product_id según applies_to
  days_of_week  SET('mon','tue','wed','thu','fri','sat','sun') NULL, -- NULL = todos los días
  start_time    TIME NULL,
  end_time      TIME NULL,
  active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_branch_active (branch_id, active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Combos (bundle de productos a precio fijo) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS combos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  branch_id     INT NOT NULL,
  name          VARCHAR(120) NOT NULL,
  description   VARCHAR(255) NULL,
  price         DECIMAL(10,2) NOT NULL,
  image_url     VARCHAR(255) NULL,
  active        TINYINT(1) NOT NULL DEFAULT 1,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_branch_active (branch_id, active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS combo_items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  combo_id      INT NOT NULL,
  product_id    INT NOT NULL,
  quantity      INT NOT NULL DEFAULT 1,
  FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE CASCADE,
  INDEX idx_combo (combo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Cupones (código canjeable al confirmar el pedido) ──────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  branch_id     INT NOT NULL,
  code          VARCHAR(30) NOT NULL,
  type          ENUM('discount_percent','discount_amount') NOT NULL,
  value         DECIMAL(10,2) NOT NULL,
  max_uses      INT NULL,               -- NULL = ilimitado
  uses_count    INT NOT NULL DEFAULT 0,
  expires_at    DATETIME NULL,
  active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_branch_code (branch_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Reglas de lealtad ("compra X veces y recibe Y") ────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_rules (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  branch_id           INT NOT NULL,
  name                VARCHAR(120) NOT NULL,
  purchases_required  INT NOT NULL,
  reward_type         ENUM('free_product','discount_percent','discount_amount') NOT NULL,
  reward_value        DECIMAL(10,2) NULL,   -- % o monto (NULL si reward_type = free_product)
  reward_product_id   INT NULL,
  active              TINYINT(1) NOT NULL DEFAULT 1,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_branch_active (branch_id, active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

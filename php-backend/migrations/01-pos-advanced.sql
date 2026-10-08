-- RestaurOS — Migración: POS Avanzado
-- Modificadores de productos, descuentos, propinas y pagos (cuenta dividida)
-- Ejecutar una sola vez sobre la base existente.
USE tallerch_restauros;

-- ── Modificadores ────────────────────────────────────────────────────────────
-- Grupos de modificadores (ej. "Término de la carne", "Extras", "Sin ingredientes")
CREATE TABLE IF NOT EXISTS modifier_groups (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  branch_id   INT          NOT NULL,
  name        VARCHAR(100) NOT NULL,
  min_select  INT          NOT NULL DEFAULT 0,   -- mínimo de opciones a elegir
  max_select  INT          NOT NULL DEFAULT 1,   -- máximo (1 = opción única)
  required    TINYINT(1)   NOT NULL DEFAULT 0,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_branch (branch_id)
);

-- Opciones dentro de un grupo (ej. "Bien cocida", "Queso extra +$15")
CREATE TABLE IF NOT EXISTS modifiers (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  group_id    INT           NOT NULL,
  name        VARCHAR(100)  NOT NULL,
  price_delta DECIMAL(10,2) NOT NULL DEFAULT 0,  -- costo extra (o descuento si negativo)
  sort_order  INT           NOT NULL DEFAULT 0,
  INDEX idx_group (group_id),
  FOREIGN KEY (group_id) REFERENCES modifier_groups(id) ON DELETE CASCADE
);

-- Qué grupos de modificadores aplican a qué productos
CREATE TABLE IF NOT EXISTS product_modifier_groups (
  product_id INT NOT NULL,
  group_id   INT NOT NULL,
  PRIMARY KEY (product_id, group_id),
  INDEX idx_group (group_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id)   REFERENCES modifier_groups(id) ON DELETE CASCADE
);

-- ── Extensiones a order_items ────────────────────────────────────────────────
-- Modificadores elegidos (JSON: [{name, price_delta}]) y notas por ítem.
ALTER TABLE order_items
  ADD COLUMN modifiers_json TEXT        NULL AFTER subtotal,
  ADD COLUMN item_notes     VARCHAR(255) NULL AFTER modifiers_json;

-- ── Extensiones a orders ─────────────────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN discount       DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER total,
  ADD COLUMN tip            DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER discount,
  ADD COLUMN paid           DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER tip,
  ADD COLUMN payment_status ENUM('unpaid','partial','paid') NOT NULL DEFAULT 'unpaid' AFTER paid;

-- ── Pagos (permite cuenta dividida: varios pagos por orden) ───────────────────
CREATE TABLE IF NOT EXISTS order_payments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  order_id   INT           NOT NULL,
  branch_id  INT           NOT NULL,
  method     ENUM('efectivo','tarjeta','transferencia','monedero','otro') NOT NULL DEFAULT 'efectivo',
  amount     DECIMAL(10,2) NOT NULL,
  tip        DECIMAL(10,2) NOT NULL DEFAULT 0,
  received   DECIMAL(10,2) NULL,    -- efectivo recibido (para calcular cambio)
  reference  VARCHAR(100)  NULL,    -- folio de tarjeta/transferencia
  created_by INT           NULL,
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order  (order_id),
  INDEX idx_branch (branch_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

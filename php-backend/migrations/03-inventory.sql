-- RestaurOS — Migración: Inventario y Compras
-- Insumos con stock, recetas (escandallos), mermas, proveedores y compras.
USE tallerch_restauros;

-- Insumos / materia prima.
CREATE TABLE IF NOT EXISTS inventory_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  branch_id  INT           NOT NULL,
  name       VARCHAR(120)  NOT NULL,
  unit       VARCHAR(20)   NOT NULL DEFAULT 'pza',  -- kg, g, l, ml, pza…
  stock      DECIMAL(12,3) NOT NULL DEFAULT 0,
  min_stock  DECIMAL(12,3) NOT NULL DEFAULT 0,      -- alerta de stock bajo
  cost       DECIMAL(10,2) NOT NULL DEFAULT 0,      -- costo por unidad
  active     TINYINT(1)    NOT NULL DEFAULT 1,
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_branch (branch_id)
);

-- Receta / escandallo: insumos que consume un producto al venderse.
CREATE TABLE IF NOT EXISTS recipe_items (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  product_id        INT           NOT NULL,
  inventory_item_id INT           NOT NULL,
  quantity          DECIMAL(12,3) NOT NULL,
  INDEX idx_product (product_id),
  FOREIGN KEY (product_id)        REFERENCES products(id)        ON DELETE CASCADE,
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
);

-- Kardex: todo cambio de stock deja rastro.
CREATE TABLE IF NOT EXISTS inventory_movements (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  branch_id         INT           NOT NULL,
  inventory_item_id INT           NOT NULL,
  type              ENUM('purchase','sale','waste','adjustment') NOT NULL,
  quantity          DECIMAL(12,3) NOT NULL,  -- positivo entra, negativo sale
  reason            VARCHAR(200)  NULL,
  ref_id            INT           NULL,      -- id de orden/compra relacionada
  created_by        INT           NULL,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_item (inventory_item_id),
  INDEX idx_branch (branch_id)
);

-- Proveedores.
CREATE TABLE IF NOT EXISTS suppliers (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  branch_id  INT           NOT NULL,
  name       VARCHAR(150)  NOT NULL,
  contact    VARCHAR(120)  NULL,
  phone      VARCHAR(30)   NULL,
  email      VARCHAR(150)  NULL,
  notes      TEXT          NULL,
  active     TINYINT(1)    NOT NULL DEFAULT 1,
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_branch (branch_id)
);

-- Órdenes de compra.
CREATE TABLE IF NOT EXISTS purchase_orders (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  branch_id   INT           NOT NULL,
  supplier_id INT           NULL,
  status      ENUM('pending','received','cancelled') NOT NULL DEFAULT 'pending',
  total       DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes       TEXT          NULL,
  created_by  INT           NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  received_at DATETIME      NULL,
  INDEX idx_branch (branch_id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  po_id             INT           NOT NULL,
  inventory_item_id INT           NOT NULL,
  quantity          DECIMAL(12,3) NOT NULL,
  unit_cost         DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal          DECIMAL(12,2) NOT NULL DEFAULT 0,
  INDEX idx_po (po_id),
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

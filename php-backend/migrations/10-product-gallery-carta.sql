-- RestaurOS — Migración idempotente: galería de imágenes, alérgenos y badge
-- Author: Carlos Jaime López Martínez
-- Ejecutar sobre tallerch_restauros. Seguro de correr varias veces.

-- ── 1. products.allergens (texto separado por comas) ────────────────────────
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'allergens');
SET @sql := IF(@col = 0,
  "ALTER TABLE products ADD COLUMN allergens VARCHAR(255) NULL AFTER ingredients",
  "SELECT 'products.allergens ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 2. products.badge (etiqueta destacada) ──────────────────────────────────
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'badge');
SET @sql := IF(@col = 0,
  "ALTER TABLE products ADD COLUMN badge VARCHAR(20) NULL AFTER allergens",
  "SELECT 'products.badge ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 3. Tabla de imágenes del producto (hasta 5 por producto) ────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  product_id  INT NOT NULL,
  branch_id   INT NOT NULL,
  url         VARCHAR(500) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pimg_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product (product_id, sort_order)
);

-- ── 4. Sembrar la galería con la imagen principal existente (una sola vez) ──
INSERT INTO product_images (product_id, branch_id, url, sort_order)
SELECT p.id, p.branch_id, p.image_url, 0
FROM products p
WHERE p.image_url IS NOT NULL AND p.image_url <> ''
  AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id);

-- RestaurOS — Migración idempotente: capa de ejecución de Promociones/Combos/Lealtad.
-- El CRUD de promotions/combos/coupons/loyalty_rules (migración 33) ya existía,
-- pero nada los aplicaba a un pedido real. Esta migración agrega lo mínimo para
-- que sí lo hagan:
--   · order_items.combo_id — agrupa las líneas expandidas de un combo para
--     mostrarlas juntas en recibo/reportes. NO participa en ningún cálculo:
--     el precio ya viene prorrateado en cada línea (ver evaluateOrderPromotions()
--     en promotions.php), así que subtotal/impuestos/total no cambian.
--   · order_discounts_applied — auditoría de CADA descuento aplicado (promoción,
--     cupón o lealtad) con su etiqueta y monto, para mostrar en el recibo/detalle
--     de pedido POR QUÉ se descontó, en vez de solo el número final.
-- Segura de ejecutar varias veces. Ejecutar sobre tallerch_restauros.
--
-- NOTA: sin FOREIGN KEY hacia `orders`/`combos` (mismo criterio que el resto de
-- migraciones del proyecto — ver 25-whatsapp.sql). Integridad por aplicación.
USE tallerch_restauros;

-- ── 1) order_items.combo_id ──────────────────────────────────────────────────
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'combo_id');
SET @sql := IF(@col = 0,
  "ALTER TABLE order_items ADD COLUMN combo_id INT NULL DEFAULT NULL AFTER product_id",
  "SELECT 'order_items.combo_id ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND INDEX_NAME = 'idx_combo_id');
SET @sql := IF(@idx = 0,
  "ALTER TABLE order_items ADD INDEX idx_combo_id (combo_id)",
  "SELECT 'idx_combo_id ya existe'");
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── 2) order_discounts_applied ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_discounts_applied (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  order_id     INT           NOT NULL,
  kind         ENUM('promotion','coupon','loyalty') NOT NULL,
  reference_id INT           NULL,
  label        VARCHAR(160)  NOT NULL,
  amount       DECIMAL(10,2) NOT NULL,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

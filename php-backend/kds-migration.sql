-- FoodIX KDS — Migration
-- Ejecutar sobre la base de datos ya existente

USE tallerch_foodix;

-- 1. Agregar estación a categorías
ALTER TABLE categories
  ADD COLUMN station ENUM('hot','cold','both') NOT NULL DEFAULT 'hot' AFTER color;

-- 2. Override de estación a nivel de producto
ALTER TABLE products
  ADD COLUMN station_override ENUM('hot','cold','both') NULL DEFAULT NULL AFTER barcode;

-- 3. Columna station en usuarios (para cocineros de estación específica)
ALTER TABLE users
  ADD COLUMN station ENUM('hot','cold','both') NULL DEFAULT NULL AFTER active;

-- 4. Tabla de estado de ítem por estación
CREATE TABLE order_item_station_status (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  order_id      INT NOT NULL,
  order_item_id INT NOT NULL,
  station       ENUM('hot','cold') NOT NULL,
  status        ENUM('pending','preparing','ready') NOT NULL DEFAULT 'pending',
  updated_by    INT NULL,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_oiss_order      FOREIGN KEY (order_id)      REFERENCES orders(id)      ON DELETE CASCADE,
  CONSTRAINT fk_oiss_item       FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_oiss_updated_by FOREIGN KEY (updated_by)    REFERENCES users(id)       ON DELETE SET NULL,
  UNIQUE KEY uq_item_station (order_item_id, station),
  INDEX idx_order_station (order_id, station),
  INDEX idx_status        (status)
);

-- 5. Vista de resumen por estación (para saber si un pedido está completo)
CREATE OR REPLACE VIEW v_order_station_summary AS
SELECT
  oiss.order_id,
  oiss.station,
  COUNT(*)                                                              AS total_items,
  SUM(CASE WHEN oiss.status = 'ready' THEN 1 ELSE 0 END)             AS ready_items,
  CASE
    WHEN COUNT(*) = SUM(CASE WHEN oiss.status = 'ready' THEN 1 ELSE 0 END)
    THEN 1 ELSE 0
  END AS station_complete
FROM order_item_station_status oiss
GROUP BY oiss.order_id, oiss.station;

-- 6. Vista global de completitud total de una orden
CREATE OR REPLACE VIEW v_order_fully_ready AS
SELECT
  order_id,
  CASE
    WHEN COUNT(*) = SUM(station_complete) THEN 1
    ELSE 0
  END AS fully_ready
FROM v_order_station_summary
GROUP BY order_id;

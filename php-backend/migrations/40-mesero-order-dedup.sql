-- RestaurOS — Migración idempotente: guard anti-duplicado para el flujo
-- offline-first del mesero (outbox en el cliente). Evita que un reintento
-- de la cola tras recuperar conexión duplique un pedido o duplique líneas
-- agregadas a una orden ya abierta.
-- Segura de ejecutar varias veces. Ejecutar sobre tallerch_restauros.
USE tallerch_restauros;

CREATE TABLE IF NOT EXISTS mesero_request_dedup (
  client_request_id CHAR(36)    NOT NULL,          -- UUID generado en el cliente
  branch_id          INT         NOT NULL,
  action             ENUM('create_order','add_items') NOT NULL,
  order_id           INT         NOT NULL,          -- orden resultante (nueva o existente)
  created_at         DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (client_request_id),
  INDEX idx_branch (branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

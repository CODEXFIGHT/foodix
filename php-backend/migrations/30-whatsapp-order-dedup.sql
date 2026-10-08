-- RestaurOS — Migración idempotente: guard anti-duplicado para pedidos de
-- WhatsApp. Evita que un doble envío del mismo carrito (retry de red, doble
-- tap en "confirmar") cree dos pedidos idénticos para el mismo cliente.
-- Segura de ejecutar varias veces. Ejecutar sobre tallerch_restauros.
USE tallerch_restauros;

CREATE TABLE IF NOT EXISTS wa_order_dedup (
  branch_id  INT         NOT NULL,
  phone      VARCHAR(32) NOT NULL,
  cart_hash  CHAR(64)    NOT NULL,
  order_id   INT         NOT NULL,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (branch_id, phone, cart_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

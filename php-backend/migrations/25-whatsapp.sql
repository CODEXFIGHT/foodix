-- RestaurOS — Migración: WhatsApp (Twilio / Meta / Wati) · pedidos por WhatsApp
-- Persistencia durable de la integración de WhatsApp por sucursal:
--   · wa_connections — estado de conexión por sucursal (1 fila por branch)
--   · wa_sessions    — estado conversacional + carrito por número de teléfono
--   · wa_messages    — historial básico de mensajes (entrantes/salientes)
-- Necesario porque en serverless (Vercel) el estado en memoria no sobrevive
-- entre invocaciones: el carrito se perdería entre mensajes del cliente.
-- Cada CREATE usa IF NOT EXISTS → re-ejecutable sin error.
--
-- NOTA: No se declaran FOREIGN KEY hacia `branches` (igual que el resto de
-- migraciones del proyecto). En el hosting la tabla `branches` puede no admitir
-- ser referenciada por InnoDB (motor/charset), lo que provoca el error 150. La
-- integridad por branch_id se mantiene desde la capa de aplicación; las columnas
-- quedan indexadas para el rendimiento.
USE tallerch_restauros;

-- ── 1) Estado de conexión por sucursal ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wa_connections (
  branch_id    INT          NOT NULL,
  provider     ENUM('twilio','meta','wati') NOT NULL DEFAULT 'twilio',
  status       ENUM('desconectado','conectando','conectado','error') NOT NULL DEFAULT 'desconectado',
  phone_number VARCHAR(32)  NULL,                 -- número del cliente/negocio conectado
  from_number  VARCHAR(32)  NULL,                 -- número emisor (Twilio From)
  last_sync_at DATETIME     NULL,
  last_error   VARCHAR(255) NULL,
  meta         JSON         NULL,                 -- datos extra del proveedor
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2) Sesiones conversacionales (carrito + paso del flujo) ──────────────────────
CREATE TABLE IF NOT EXISTS wa_sessions (
  id            BIGINT       NOT NULL AUTO_INCREMENT,
  branch_id     INT          NOT NULL,
  phone         VARCHAR(32)  NOT NULL,
  step          VARCHAR(24)  NOT NULL DEFAULT 'idle',
  cart          JSON         NULL,                -- [{product_id,name,price,quantity}]
  order_type    VARCHAR(16)  NULL,               -- dine_in | takeaway | delivery
  table_number  VARCHAR(16)  NULL,
  customer_name VARCHAR(80)  NULL,
  last_activity DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_wa_session (branch_id, phone),
  KEY idx_wa_session_activity (last_activity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2b) Origen y datos de cliente en pedidos (para pedidos por WhatsApp) ─────────
-- Permite distinguir en el KDS un pedido que entró por WhatsApp y mostrar el
-- nombre/teléfono del cliente. Si una columna ya existe, omite solo esa línea.
ALTER TABLE orders
  ADD COLUMN source         VARCHAR(40) NOT NULL DEFAULT 'pos' AFTER notes,
  ADD COLUMN customer_name  VARCHAR(80) NULL AFTER source,
  ADD COLUMN customer_phone VARCHAR(32) NULL AFTER customer_name;

-- ── 3) Historial básico de mensajes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wa_messages (
  id         BIGINT      NOT NULL AUTO_INCREMENT,
  branch_id  INT         NOT NULL,
  phone      VARCHAR(32) NOT NULL,
  direction  ENUM('in','out') NOT NULL,
  body       TEXT        NULL,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wa_msg_branch_phone (branch_id, phone, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- RestaurOS — Migración idempotente: monitoreo de dispositivos conectados.
-- Crea las tablas `connected_devices` (telemetría/heartbeat en vivo, periféricos)
-- y `device_events` (bitácora corta por dispositivo).
--
-- NO modifica la tabla `devices` existente (registro/aprobación de accesos):
-- son sistemas independientes. Segura de ejecutar varias veces.
-- Ejecutar sobre tallerch_restauros.

-- ── 1. connected_devices ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS connected_devices (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  branch_id         INT          NOT NULL,
  unique_device_id  VARCHAR(120) NOT NULL,
  name              VARCHAR(100) NOT NULL DEFAULT 'Dispositivo',
  type              ENUM('kiosk','waiter_tablet','kitchen_screen','cash_register',
                         'barcode_scanner','thermal_printer','pos_terminal','pos_8360',
                         'admin_computer','mobile','unknown') NOT NULL DEFAULT 'unknown',
  -- Estado persistido. online/idle/offline se DERIVAN de los timestamps al leer;
  -- aquí se guarda principalmente para estados "pegajosos" (error) y periféricos
  -- de gestión manual (online/in_test/error/offline).
  status            ENUM('online','offline','idle','error','unknown','in_test')
                         NOT NULL DEFAULT 'unknown',
  module            ENUM('superadmin','admin','kiosk','waiter','kitchen','pos','unknown')
                         NOT NULL DEFAULT 'unknown',
  -- Periférico registrado manualmente (lector, impresora, caja…) vs. dispositivo
  -- con heartbeat propio. Los periféricos no expiran a offline por tiempo.
  is_peripheral     TINYINT(1)   NOT NULL DEFAULT 0,
  -- Kiosko (u otro connected_devices.id) al que está asociado el periférico.
  parent_device_id  INT          NULL DEFAULT NULL,
  model             VARCHAR(120) NULL DEFAULT NULL,
  serial_number     VARCHAR(120) NULL DEFAULT NULL,
  notes             VARCHAR(500) NULL DEFAULT NULL,
  ip_address        VARCHAR(64)  NULL DEFAULT NULL,
  user_agent        VARCHAR(400) NULL DEFAULT NULL,
  os                VARCHAR(60)  NULL DEFAULT NULL,
  browser           VARCHAR(60)  NULL DEFAULT NULL,
  app_version       VARCHAR(40)  NULL DEFAULT NULL,
  kiosk_version     VARCHAR(40)  NULL DEFAULT NULL,
  user_id           INT          NULL DEFAULT NULL,
  user_name         VARCHAR(120) NULL DEFAULT NULL,
  role              VARCHAR(30)  NULL DEFAULT NULL,
  metadata          JSON         NULL DEFAULT NULL,
  last_heartbeat_at DATETIME     NULL DEFAULT NULL,
  last_activity_at  DATETIME     NULL DEFAULT NULL,
  connected_at      DATETIME     NULL DEFAULT NULL,
  disconnected_at   DATETIME     NULL DEFAULT NULL,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_uid_branch (unique_device_id, branch_id),
  INDEX idx_branch (branch_id),
  INDEX idx_status (status),
  INDEX idx_last_hb (last_heartbeat_at),
  INDEX idx_parent (parent_device_id)
);

-- ── 2. device_events ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS device_events (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  device_id   INT          NOT NULL,
  branch_id   INT          NOT NULL,
  type        ENUM('device_connected','device_disconnected','device_heartbeat',
                   'device_idle','device_error','peripheral_registered',
                   'peripheral_status_changed','device_removed','device_renamed')
                   NOT NULL,
  message     VARCHAR(255) NOT NULL DEFAULT '',
  metadata    JSON         NULL DEFAULT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_device_created (device_id, created_at),
  INDEX idx_branch (branch_id)
);

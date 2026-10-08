-- RestaurOS — Migración 18: Solicitudes de contacto / cotización (landing)
-- Guarda los mensajes enviados desde el formulario público de la landing para
-- que el superadmin los revise y se notifiquen por correo a la marca.

CREATE TABLE IF NOT EXISTS contact_leads (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  whatsapp    VARCHAR(40)  NOT NULL,
  message     TEXT         NOT NULL,
  status      ENUM('new','read','archived') NOT NULL DEFAULT 'new',
  source      VARCHAR(40)  NOT NULL DEFAULT 'landing',
  ip          VARCHAR(45)  NULL,
  user_agent  VARCHAR(255) NULL,
  emailed     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

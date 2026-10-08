-- RestaurOS — Migración: preferencias de accesibilidad POS por usuario
-- Permite sincronizar modo mobile/web/tablet/kiosko, letra, controles, iconos
-- y alto contraste entre dispositivos y sesiones abiertas.
USE tallerch_restauros;

CREATE TABLE IF NOT EXISTS user_pos_accessibility_settings (
  user_id       INT NOT NULL,
  branch_id     INT NULL,
  role          ENUM('superadmin','admin','mesero','cocina') NOT NULL DEFAULT 'mesero',
  mode          ENUM('default','mobile','tablet','kiosk') NOT NULL DEFAULT 'default',
  font_scale    DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  control_scale DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  icon_scale    DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  high_contrast TINYINT(1) NOT NULL DEFAULT 0,
  updated_by    INT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  KEY idx_pos_access_branch (branch_id),
  KEY idx_pos_access_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

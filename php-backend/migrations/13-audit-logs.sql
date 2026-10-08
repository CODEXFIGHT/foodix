-- RestaurOS — Bitácora de auditoría general (Fase 2: trazabilidad de cambios)
-- Idempotente. Ejecutar sobre tallerch_restauros.
-- Usa LONGTEXT (no JSON) por compatibilidad con MySQL 5.6/MariaDB del hosting.

CREATE TABLE IF NOT EXISTS audit_logs (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  branch_id    INT          NULL,
  user_id      INT          NULL,
  device_uid   VARCHAR(120) NULL,
  action       VARCHAR(60)  NOT NULL,
  entity_type  VARCHAR(40)  NOT NULL,
  entity_id    INT          NULL,
  old_data     LONGTEXT     NULL,
  new_data     LONGTEXT     NULL,
  app_version  VARCHAR(20)  NULL,
  build_number VARCHAR(20)  NULL,
  ip_address   VARCHAR(45)  NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_branch_created (branch_id, created_at),
  INDEX idx_entity         (entity_type, entity_id),
  INDEX idx_action         (action)
);

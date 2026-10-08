-- =============================================================================
-- RestaurOS — Migración 19: suscripciones Web Push
-- Almacena las suscripciones push de cada dispositivo/usuario para poder enviar
-- notificaciones del servidor (pedido listo, nueva reservación, etc.).
-- Idempotente por `endpoint` (cada navegador/dispositivo tiene uno único).
-- =============================================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id   INT UNSIGNED NULL,
    user_id     INT UNSIGNED NULL,
    endpoint    VARCHAR(512) NOT NULL,
    p256dh      VARCHAR(255) NOT NULL,
    auth        VARCHAR(255) NOT NULL,
    user_agent  VARCHAR(255) NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_endpoint (endpoint),
    KEY idx_branch (branch_id),
    KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

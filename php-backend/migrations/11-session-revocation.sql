-- RestaurOS — Migración 11: revocación de sesiones por sucursal
-- ---------------------------------------------------------------------------
-- Cuando el superadmin suspende, cancela o da de baja una suscripción, se marca
-- esta columna con la hora del corte. Todo JWT emitido ANTES de ese instante
-- queda invalidado en `requireAuth()`, cerrando la sesión en TODOS los
-- dispositivos de la sucursal en tiempo real. Al reactivar (o al aprobarse un
-- pago) se vuelve a NULL para permitir nuevas sesiones.

ALTER TABLE branches
  ADD COLUMN sessions_revoked_at DATETIME NULL DEFAULT NULL AFTER active;

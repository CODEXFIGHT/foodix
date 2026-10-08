-- RestaurOS — Migración: renombrar planes a Starter/Pro/AI/MultiSucursal
--
-- Consolida el naming de planes que hasta ahora vivía disperso en 3 formas
-- distintas (trial/basic/pro/enterprise en BD y tipos; esencial/pro en el
-- selector del superadmin; lite/pro en la landing) en un único set de
-- valores, usado por todo el sistema (frontend, backend, landing):
--   trial | starter | pro | ai | multisucursal
--
-- ⚠️ DECISIÓN DE NEGOCIO INCLUIDA AQUÍ — revisa antes de ejecutar:
-- Antes de esta migración, el plan 'pro' YA incluía WhatsApp (ver el
-- LICENSE_BY_PLAN legado). El nuevo tier 'pro' NO incluye WhatsApp —eso se
-- movió al nuevo tier 'ai'—. Para no quitarle a un cliente que ya paga una
-- función que ya tiene, este script migra las sucursales que HOY están en
-- 'pro' hacia 'ai' (conservan WhatsApp). Si prefieres que conserven el
-- nombre "pro" aunque eso les quite WhatsApp, comenta la línea marcada más
-- abajo y descomenta la alternativa.
--
-- Correr manualmente contra la base de datos de producción (no se ejecuta
-- automáticamente). Revisa el UPDATE de la sección 2 antes de correrlo.
USE tallerch_restauros;

-- ── 1) Ampliar el ENUM para incluir los valores nuevos sin romper filas existentes ──
ALTER TABLE subscriptions
  MODIFY COLUMN plan ENUM('trial','basic','starter','pro','ai','enterprise','multisucursal')
                 NOT NULL DEFAULT 'trial';

-- ── 2) Migrar los datos existentes a los nombres nuevos ─────────────────────────
UPDATE subscriptions SET plan = 'starter' WHERE plan = 'basic';

-- Grandfather: 'pro' legado (con WhatsApp) → 'ai' (mantiene WhatsApp).
UPDATE subscriptions SET plan = 'ai' WHERE plan = 'pro';
-- Alternativa (si NO quieres grandfathering y prefieres que se queden en
-- 'pro' aunque pierdan WhatsApp): comenta la línea de arriba y usa esta:
-- UPDATE subscriptions SET plan = 'pro' WHERE plan = 'pro';

UPDATE subscriptions SET plan = 'multisucursal' WHERE plan = 'enterprise';

-- ── 3) Angostar el ENUM otra vez, ya sin los valores legado ─────────────────────
ALTER TABLE subscriptions
  MODIFY COLUMN plan ENUM('trial','starter','pro','ai','multisucursal') NOT NULL DEFAULT 'trial';

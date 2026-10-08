# Checklist de despliegue — backend PHP (tallercheck.mx / NeuBox)

Estado verificado en producción el **2026-06-01**.

## ✅ Ya desplegado y funcionando
- Rutas core: `auth`, `branches`, `devices`, `users`, `products`, `categories`,
  `orders`, `sales`, `subscription`, **`superadmin/subscriptions`**, **`billing`**, `webhooks`.
- Migraciones aplicadas en MySQL: **01–06** (la tabla `subscriptions` ya tiene
  las columnas de billing; el login por `username` funciona).

## ⛔ Pendiente de subir (optimizaciones recientes)

### 1. Archivos PHP a sobrescribir vía FTP / Administrador de archivos
Subir a `tallercheck.mx/restauros/api/` (ruta del backend):

| Archivo local | Qué aporta |
|---|---|
| `php-backend/index.php` | Compresión **gzip** (~70-80% menos transferencia) + cabeceras anti-caché |
| `php-backend/routes/orders.php` | Elimina **N+1** en `GET /orders` (1 query en vez de hasta 200) |
| `php-backend/.user.ini` | **OPcache** + realpath cache (best-effort) |
| `php-backend/routes/billing.php` | No degrada una suscripción vigente al generar la referencia SPEI (evitaba que el admin quedara bloqueado) |

> 💡 Alternativa segura: subir **toda la carpeta `php-backend/`** sobrescribiendo.
> `config/database.php` del repo ya tiene las credenciales de producción y
> `config/stripe.php` son placeholders (los pagos con tarjeta dan 503 hasta
> poner llaves Stripe reales — el flujo SPEI no se ve afectado).

### 2. SQL a correr en phpMyAdmin
```sql
USE tallerch_restauros;

-- (a) Índice de rendimiento (migración 07)
ALTER TABLE orders
  ADD INDEX idx_branch_status_created (branch_id, status, created_at);

-- (b) Datos SPEI reales (la fila ya existe con datos viejos → UPDATE)
UPDATE bank_transfer_config
SET bank_name        = 'Ualá',
    clabe            = '138580000012357007',
    beneficiary_name = 'DevHiveRestaurOS',
    instructions     = 'Realiza la transferencia SPEI con el concepto exacto indicado. Cuenta Ualá · Tel. 7734090058. Tu acceso se reactiva al confirmar el pago.',
    is_active        = 1;
```

## ✅ Verificación post-despliegue
```bash
# gzip activo (debe aparecer Content-Encoding: gzip)
curl -s -H "Accept-Encoding: gzip" -D - -o /dev/null \
  "https://tallercheck.mx/restauros/api/index.php/products?branch_id=3"
```
- En la app: la tarjeta SPEI debe mostrar **Ualá / DevHiveRestaurOS / CLABE 138580…**.
- El listado de pedidos debe seguir funcionando igual (más rápido).

## Notas
- El frontend (Vercel) se despliega solo con cada push a `master`; no requiere acción manual.
- Estado de suscripción de una sucursal: panel superadmin → Sucursales → (abrir) →
  pestaña Suscripción → Editar; o `UPDATE subscriptions SET status='active' WHERE branch_id=?;`

# Guía de SuperAdmin — FoodIX

El **SuperAdmin** es el dueño del SaaS: administra **todas** las sucursales (clientes), sus **licencias** y sus **cobros** desde el panel global `/superadmin`.

> Acceso: inicia sesión con un usuario de rol `superadmin`. El menú lateral del panel es oscuro (estilo Vercel).

## Índice
1. [Panel y secciones](#1-panel-y-secciones)
2. [Sucursales / clientes](#2-sucursales--clientes)
3. [Billing CRM — Suscripciones](#3-billing-crm--suscripciones)
4. [Calendario de pagos](#4-calendario-de-pagos)
5. [Registrar pagos (manual y adelantado)](#5-registrar-pagos-manual-y-adelantado)
6. [Ciclo de vida: activar, suspender, cancelar, reactivar](#6-ciclo-de-vida)
7. [Licencias](#7-licencias)
8. [Transferencias SPEI](#8-transferencias-spei)
9. [Dispositivos y POS](#9-dispositivos-y-pos)
10. [Auditoría](#10-auditoría)

---

## 1. Panel y secciones

El panel `/superadmin` incluye:

| Sección | Ruta | Para qué |
|---------|------|----------|
| Dashboard | `/superadmin` | Vista general |
| Suscripciones (Billing CRM) | `/superadmin/subscriptions` | Clientes, pagos, estado financiero |
| Sucursales | `/superadmin/branches` | Alta y edición de clientes |
| Dispositivos / Device Center | `/superadmin/devices`, `/superadmin/device-center` | Equipos conectados |
| Leads | `/superadmin/leads` | Solicitudes de contacto |

---

## 2. Sucursales / clientes

> `/superadmin/branches`

- **Registrar cliente**: alta de una sucursal nueva (nombre, slug, datos, plan inicial).
- Cada sucursal tiene su propio admin, usuarios, carta y caja.
- Edita datos, logo y configuración desde el detalle.

---

## 3. Billing CRM — Suscripciones

> `/superadmin/subscriptions`

Es el centro de control financiero. Arriba verás un **dashboard de KPIs**:

- **MRR** (ingreso recurrente mensual) y **ARR** (anual estimado).
- **Ingresos del mes** y **del año**.
- Conteos por estado: activos, periodo de gracia, por vencer, vencen esta semana, suspendidos, pago adelantado, cancelados, expirados, pendientes de transferencia.
- **Próximos cobros**.

Debajo, los clientes como **tarjetas** (o lista): logo, nombre, propietario, contacto, plan, precio, alta, próximo vencimiento, último pago y **estado**. Usa los **filtros** (Activas, Por vencer, En gracia, Vencen esta semana/mes…) y el **buscador** (nombre, propietario, email, teléfono, plan, ID).

> ![Suscripciones](SCREENSHOTS/subscriptions.png)
> *Captura pendiente: `docs/SCREENSHOTS/subscriptions.png`.*

Pulsa **Administrar** en cualquier cliente para abrir su detalle (pestañas **Resumen / Calendario / Historial / Acciones**).

---

## 4. Calendario de pagos

> Detalle del cliente → pestaña **Calendario**.

Muestra una vista **anual (2026–2030)** con una celda por mes, coloreada según su estado:

| Color | Estado |
|-------|--------|
| 🟢 Verde | Pagado |
| 🟡 Ámbar | Pagado por adelantado |
| 🔴 Rojo | Pendiente |
| ⚫ Gris | Suspendido |
| ⚪ Slate | Cancelado |

- **Click en un mes pendiente** → abre el registro de pago **prefijado a ese mes**.
- **Click en un mes pagado** → muestra el detalle (monto, fecha, pago #).

El calendario es un **caché** que se reconstruye solo cuando registras o editas un pago. La verdad vive en los pagos.

---

## 5. Registrar pagos (manual y adelantado)

> Detalle → **Calendario** o **Historial** → **Registrar pago**.

1. Elige cuántos **meses cubrir** (1 = pago normal; 2+ = **pago adelantado**).
2. Elige el **método**: Transferencia, SPEI, Efectivo, Tarjeta, Mercado Pago, Stripe u Otro.
3. El **monto** se sugiere (precio × meses) y es editable.
4. Indica fecha, referencia bancaria y observaciones.
5. Sube el **comprobante** (opcional).
6. Confirma.

El sistema marca esos meses como pagados, **recalcula el próximo vencimiento** (anclado al día 1) y reactiva al cliente si estaba suspendido. Todo queda en el historial y la auditoría.

> **Pago adelantado** = un solo pago que cubre varios meses (ej. Jul–Oct). Esos meses se pintan 🟡 en el calendario hasta que llegan, y el vencimiento avanza automáticamente.

---

## 6. Ciclo de vida

> Detalle → pestaña **Acciones**.

| Acción | Efecto |
|--------|--------|
| **Reactivar** | Devuelve el acceso (estado activo). Restablece la licencia. |
| **Suspender** | Bloquea el acceso al cliente, **conserva** todos los datos. Registra motivo. |
| **Cancelar plan** | No renovará; conserva acceso hasta fin del periodo pagado. |
| **Dar de baja definitivamente** | Baja total con **doble confirmación** (escribir el nombre). Bloquea acceso. **Nunca borra ventas ni datos del restaurante.** |

Registrar un pago manual también **reactiva** automáticamente.

---

## 7. Licencias

La licencia se **deriva del plan** (sin tabla aparte por ahora) e indica límites y funciones:

| Plan | Usuarios | POS | Sucursales | Funciones |
|------|----------|-----|------------|-----------|
| trial | 3 | 1 | 1 | pos, kds, reports |
| basic | 5 | 1 | 1 | + inventory |
| pro | 15 | 2 | 3 | + customers, cash |
| enterprise | ∞ | 5 | 10 | + multi_branch, api |

La **expiración** real es la fecha de vencimiento de la suscripción. Se actualiza al registrar pagos. Ver [Sistema de Licencias](LICENSE_SYSTEM.md).

---

## 8. Transferencias SPEI

Cuando un cliente reporta una transferencia, queda **en revisión**. En el **Historial** del cliente puedes **Aprobar** (activa la suscripción) o **Rechazar** (indicando motivo). Los datos bancarios se configuran en `bank_transfer_config`.

---

## 9. Dispositivos y POS

- **Dispositivos / Device Center**: equipos conectados por sucursal, con estado y última actividad.
- El **número de POS** por establecimiento define cuántas cajas/estaciones lógicas operan. Cada turno de caja se liga a un **usuario + POS**.

---

## 10. Auditoría

Cada acción crítica queda registrada en `subscription_audit_log` (y `audit_logs` para operación): pago registrado/aprobado/rechazado, suspensión, reactivación, cancelación, baja, cambios de estado. Guarda **usuario, fecha/hora y nota**.

---

📖 Relacionado: [Facturación](BILLING.md) · [Sistema de Licencias](LICENSE_SYSTEM.md) · [Arquitectura](ARCHITECTURE.md)

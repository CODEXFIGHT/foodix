# Guía de Administrador — RestaurOS

El **Admin** configura y opera todo su restaurante (una sucursal). Esta guía resume cada módulo. Para el flujo paso a paso de venta, ve al [Manual de Usuario](USER_MANUAL.md).

## Índice
1. [Carta: categorías, productos y modificadores](#1-carta)
2. [Inventario](#2-inventario)
3. [Mesas](#3-mesas)
4. [Caja](#4-caja)
5. [Usuarios](#5-usuarios)
6. [Clientes](#6-clientes)
7. [Reportes y ventas](#7-reportes-y-ventas)
8. [Dispositivos](#8-dispositivos)
9. [Configuración](#9-configuración)
10. [Mi Suscripción](#10-mi-suscripción)

---

## 1. Carta

> Menú → **Carta / Menú**, **Categorías**, **Modificadores**.

- **Categorías**: agrupan los productos (Entradas, Bebidas…). Ordénalas.
- **Productos**: nombre, categoría, precio, imagen y **tipo de precio** (fijo, abierto, por kilogramo).
- **Modificadores**: grupos de opciones (término, extras, sin ingredientes) asignables a productos.
- Galería de imágenes, alérgenos y badges disponibles por producto.

### Carta digital pública

La carta pública se abre desde el enlace o QR de la sucursal (`/carta/{slug}`).
Los cambios de categorías, productos, precios, imágenes y disponibilidad se
reflejan automáticamente después de actualizar el catálogo.

- **Vista vertical**: catálogo por secciones en una cuadrícula responsive.
- La carta utiliza una vista vertical responsive por secciones, optimizada para
  desplazamiento continuo en mobile, tablet y desktop.
- El slider de categorías se genera desde las categorías activas; **Todos**
  siempre aparece primero y el filtrado usa el ID real de la categoría.
- El buscador combina texto y categoría, ignora mayúsculas y acentos, y permite
  compartir una categoría mediante `?categoria=bebidas`.
- Al tocar un producto se abre su detalle con imágenes, descripción, precio,
  zoom, cantidad y **Agregar al pedido**. El carrito se conserva al cambiar de
  categoría o de vista.
- La dirección de la sucursal aparece en el encabezado y se desplaza
  automáticamente cuando es demasiado larga para la pantalla.

---

## 2. Inventario

> Menú → **Inventario**.

- Insumos, existencias y proveedores.
- **Recetas/ingredientes**: al vender un producto, su stock se descuenta automáticamente.
- Alertas de bajo inventario.

---

## 3. Mesas

> Menú → **Mesas**.

Alta de mesas por zona; estados **libre/ocupada**; cada mesa abre un pedido. Soporta **dividir cuenta** al cobrar.

---

## 4. Caja

> Menú → **Caja**. **Obligatoria para cobrar.**

Abre turno (monto inicial), registra **entradas/salidas** de efectivo y realiza el **corte/cierre**. El indicador del Topbar muestra si hay caja abierta. Ver [Guía de Caja](CASHIER_GUIDE.md).

---

## 5. Usuarios

> Menú → **Usuarios**.

Alta y edición de meseros, cocina y otros admins. Asigna **estación** a cocina (Caliente/Frío). Restablece contraseñas. Cada usuario debe ser personal para que el corte y la auditoría identifiquen quién operó.

---

## 6. Clientes

> Menú → **Clientes**.

Registro de clientes con **puntos, visitas y monedero** (saldo). Útil para lealtad y pagos con saldo.

---

## 7. Reportes y ventas

> Menú → **Ventas**.

Ventas del día, por método de pago y productos top. Los cortes se basan en el **turno de caja** (no solo la fecha), evitando mezclar POS/turnos.

---

## 8. Dispositivos

> Menú → **Dispositivos**.

Aprueba o bloquea los equipos (tablets/POS) que inician sesión en tu sucursal. Un dispositivo bloqueado no puede operar.

---

## 9. Configuración

> Menú → **Ajustes**.

- Identidad del negocio (nombre, logo, contacto).
- **IVA**: activación y tasa (incluido en el precio, solo desglose).
- **Impresión** de tickets.
- Estaciones de cocina y número de POS.
- Tema claro/oscuro.

---

## 10. Mi Suscripción

> Menú → **Mi Suscripción**.

Estado del plan, días para renovar, pago con **tarjeta (Stripe)** o **transferencia/SPEI** con comprobante. Ver [Facturación](BILLING.md).

---

📖 Relacionado: [Manual de Usuario](USER_MANUAL.md) · [Guía de Caja](CASHIER_GUIDE.md) · [FAQ](FAQ.md)

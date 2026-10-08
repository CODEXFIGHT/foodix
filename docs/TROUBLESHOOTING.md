# Solución de Problemas — RestaurOS

Formato: **Síntoma → Causa posible → Solución → Prevención**. Para dudas simples ve al [FAQ](FAQ.md).

---

### 🔒 Caja bloqueada / "Necesitas abrir caja"
- **Síntoma:** al cobrar aparece *"Para continuar necesitas abrir caja o iniciar turno"*.
- **Causa:** no hay un turno de caja abierto en ese POS.
- **Solución:** pulsa **Abrir caja ahora**, captura el monto inicial e inicia turno.
- **Prevención:** abre la caja al comenzar la jornada.

### 🔁 "Ya hay una caja abierta en este POS"
- **Síntoma:** no deja abrir caja.
- **Causa:** existe un turno abierto (tuyo o de otro usuario) en el mismo POS, o quedó abierto del día anterior.
- **Solución:** cierra el turno existente (Corte Z) y abre uno nuevo.
- **Prevención:** cierra caja al terminar cada jornada.

### 👤 Error de login
- **Síntoma:** no entra con usuario/contraseña.
- **Causa:** credenciales incorrectas o dispositivo no aprobado.
- **Solución:** verifica datos; pide al admin aprobar el dispositivo en *Dispositivos*.
- **Prevención:** registra y aprueba los equipos antes de operar.

### ⌛ Sesión expirada
- **Síntoma:** te saca o pide volver a entrar.
- **Causa:** el token de sesión caducó o fue revocado.
- **Solución:** vuelve a iniciar sesión.
- **Prevención:** normal por seguridad; no requiere acción.

### 📟 POS / dispositivo desconectado
- **Síntoma:** el equipo aparece sin conexión en *Dispositivos*.
- **Causa:** sin internet o sesión cerrada.
- **Solución:** restablece la conexión; vuelve a iniciar sesión.
- **Prevención:** red estable; revisa el Device Center periódicamente.

### 🍳 KDS sin pedidos / sin conexión
- **Síntoma:** no llegan pedidos a cocina.
- **Causa:** sin red, notificaciones desactivadas o pantalla en segundo plano.
- **Solución:** revisa conexión y permisos; **recarga** la pantalla KDS.
- **Prevención:** mantén el dispositivo de cocina al frente y conectado.

### 🧾 Sin impresora / no imprime
- **Síntoma:** no salen tickets.
- **Causa:** impresora apagada/sin papel/no emparejada, o agente de impresión inactivo.
- **Solución:** revisa la impresora y *Ajustes → Impresión*; reinicia el agente.
- **Prevención:** verifica papel y conexión al iniciar el turno.

### 📑 Pedidos duplicados
- **Síntoma:** un pedido aparece dos veces.
- **Causa:** doble toque o reintento tras corte de red.
- **Solución:** cancela el duplicado (admin si está en preparación).
- **Prevención:** espera la confirmación antes de reintentar.

### 📦 Inventario incorrecto
- **Síntoma:** existencias que no cuadran.
- **Causa:** recetas mal configuradas, ajustes manuales o ventas sin receta.
- **Solución:** revisa las recetas/ingredientes del producto y ajusta el stock.
- **Prevención:** define bien las recetas antes de vender.

### 📡 Sin internet
- **Síntoma:** datos no se actualizan, errores al guardar.
- **Causa:** caída de red.
- **Solución:** espera la reconexión; al volver, las pantallas se refrescan solas. No cobres sin conexión.
- **Prevención:** conexión de respaldo (4G) en el local.

### 🗄️ Base de datos inaccesible / API caída
- **Síntoma:** errores de servidor, nada carga.
- **Causa:** backend o MySQL caídos.
- **Solución:** revisa el estado en el **Centro de Ayuda** (`/help` → Estado del sistema); contacta a soporte.
- **Prevención:** monitoreo del hosting; ver [Despliegue](DEPLOYMENT.md).

### 🔄 Error de sincronización
- **Síntoma:** datos desfasados entre dispositivos.
- **Causa:** red intermitente o pantalla en segundo plano.
- **Solución:** recarga; al recuperar foco, RestaurOS vuelve a sincronizar.
- **Prevención:** mantén las pantallas activas durante la operación.

### 💳 Licencia vencida / suscripción suspendida
- **Síntoma:** acceso bloqueado a la sucursal.
- **Causa:** venció la suscripción y pasó el periodo de gracia.
- **Solución:** el admin paga (tarjeta/SPEI) o el superadmin registra el pago para reactivar.
- **Prevención:** renueva antes del día 1; revisa los avisos de "por vencer".

---

📖 Relacionado: [FAQ](FAQ.md) · [Guía de Caja](CASHIER_GUIDE.md) · [Arquitectura](ARCHITECTURE.md) · [Despliegue](DEPLOYMENT.md)

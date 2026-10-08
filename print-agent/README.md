# FoodIX — Agente de impresión local

Mini servidor que corre en la **PC de caja** y permite imprimir tickets y abrir
el cajón de dinero en una **impresora de red (IP)**, aunque el backend de
FoodIX esté hospedado en la nube.

## ¿Por qué se necesita?

- El navegador **no** puede abrir conexiones TCP crudas a la impresora.
- El backend PHP está en internet y **no** puede alcanzar una impresora con IP
  local (`192.168.x.x`).
- Este agente vive en la **misma red** que la impresora y recibe los bytes
  ESC/POS por HTTP desde el navegador.

Los navegadores permiten que la app (HTTPS) llame a `http://127.0.0.1` sin
bloqueo de contenido mixto, por eso funciona.

> Si tu impresora es **USB**, no necesitas este agente: usa el modo **USB** en
> Ajustes (Chrome/Edge). El agente es solo para impresoras **de red**.

## Requisitos

- [Node.js](https://nodejs.org) 14 o superior (instala la versión **LTS**).
- La PC de caja y la impresora en la **misma red**.

## Cómo iniciarlo

1. Copia la carpeta `print-agent/` a la PC de caja.
2. Inícialo:
   - **Windows:** doble clic en `iniciar-agente.bat`
   - **macOS / Linux:** `./iniciar-agente.sh` (o `node agent.js`)
3. Deja la ventana abierta. Verás:
   ```
   Escuchando en  http://127.0.0.1:9110
   ```

## Configurar en la app

En **FoodIX → Ajustes → Impresora y cajón de dinero**:

1. Modo de conexión: **Red (IP)**
2. Escribe la **IP de la impresora** (ej. `192.168.1.50`) y puerto **9100**.
3. Activa **Usar agente local** (puerto **9110**).
4. Pulsa **Probar agente** → debe decir *"Agente local detectado"*.
5. Pulsa **Imprimir prueba** y **Abrir cajón** para verificar.

## Variables de entorno (opcionales)

| Variable         | Default       | Descripción                                  |
|------------------|---------------|----------------------------------------------|
| `PORT`           | `9110`        | Puerto en el que escucha el agente           |
| `HOST`           | `127.0.0.1`   | Interfaz de escucha                          |
| `ALLOWED_ORIGIN` | `*`           | Restringe el origen permitido (CORS)         |

Ejemplo (más seguro, solo tu dominio):

```bash
ALLOWED_ORIGIN=https://tu-app.vercel.app node agent.js
```

## Que arranque solo con la PC

### Windows (acceso directo en Inicio)
1. `Win + R` → escribe `shell:startup` → Enter.
2. Crea un acceso directo a `iniciar-agente.bat` dentro de esa carpeta.

### macOS / Linux (servicio en segundo plano)
Con [pm2](https://pm2.keymetrics.io):
```bash
npm i -g pm2
pm2 start agent.js --name restauros-print-agent
pm2 startup    # sigue las instrucciones que imprime
pm2 save
```

## Cómo saber si está funcionando

Abre en el navegador de la caja: <http://127.0.0.1:9110/health>
Debe responder:
```json
{ "ok": true, "app": "FoodIX Print Agent", "version": "1.0.0" }
```

## Seguridad

- El agente escucha solo en `127.0.0.1` (no accesible desde fuera de la PC).
- Solo reenvía bytes a la IP de impresora que la app le indica.
- Para mayor control, fija `ALLOWED_ORIGIN` a tu dominio.

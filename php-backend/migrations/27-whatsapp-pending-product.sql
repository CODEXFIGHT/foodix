-- RestaurOS — Migración: persiste `pending_product` en wa_sessions
--
-- Bug real observado: el producto que el bot está agregando (entre "elige un
-- platillo" y "confirma cantidad/notas") solo vivía en el Map de proceso, NUNCA
-- se mandaba al backend junto con el resto de la sesión. En serverless (Vercel),
-- si el mensaje de "cantidad" o de "notas" caía en una invocación distinta a la
-- que eligió el producto (algo común, sobre todo con after() liberando la
-- instancia entre mensajes), ese producto se perdía en silencio antes de llegar
-- al carrito — el cliente veía el menú de nuevo sin darse cuenta, y terminaba
-- con solo el último producto que tuvo la suerte de completarse en una sola
-- instancia "caliente".
--
-- Ejecutar una sola vez (mismo esquema que 25-whatsapp.sql). Si la columna ya
-- existe, el ALTER falla con "Duplicate column" — no pasa nada, ya está aplicada.
USE tallerch_restauros;

ALTER TABLE wa_sessions
  ADD COLUMN pending_product JSON NULL AFTER cart;

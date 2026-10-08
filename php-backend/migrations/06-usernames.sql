-- RestaurOS — Migración: usuario de acceso (username)
-- El login valida por `username`; esta migración añade la columna si falta,
-- la rellena para usuarios existentes y la vuelve única.
-- Correr DESPUÉS de 01..05.
USE tallerch_restauros;

-- 1) Agregar la columna si no existe (si ya existe, omite esta línea al re-ejecutar).
ALTER TABLE users
  ADD COLUMN username VARCHAR(60) NULL AFTER email;

-- 2) Rellenar username de usuarios existentes con su email (email es único → username único).
UPDATE users SET username = email WHERE username IS NULL OR username = '';

-- 3) Hacer el username único (omitir si la clave ya existe).
ALTER TABLE users
  ADD UNIQUE KEY uq_username (username);

-- Migración para agregar modificadores a la tabla de productos
ALTER TABLE products ADD COLUMN modifiers_json TEXT DEFAULT NULL;

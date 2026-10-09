-- ============================================================
-- FoodIX — Schema Supabase
-- Ejecutar en el SQL Editor del dashboard de Supabase
-- ============================================================
-- IMPORTANTE: Los usuarios se crean con email ficticio del dominio
-- restauros.internal  →  ej: admin@restauros.internal
-- El campo "username" en profiles es lo que ve el usuario.
-- ============================================================

-- 1. Profiles (extends auth.users)
create table if not exists public.profiles (
  id       uuid references auth.users on delete cascade primary key,
  name     text not null,
  username text not null unique,
  role     text not null check (role in ('admin', 'mesero', 'cocina'))
);
alter table public.profiles enable row level security;
create policy "Users can read own profile"   on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Trigger: create profile automatically on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _username text;
begin
  -- Extract username from metadata; fallback to part before @ in email
  _username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  insert into public.profiles (id, name, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', _username),
    _username,
    coalesce(new.raw_user_meta_data->>'role', 'mesero')
  );
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Categories
create table if not exists public.categories (
  id    uuid primary key default gen_random_uuid(),
  name  text not null,
  emoji text not null default '',
  color text not null default '#6B7280'
);
alter table public.categories enable row level security;
create policy "Authenticated read categories"   on public.categories for select  using (auth.role() = 'authenticated');
create policy "Authenticated insert categories" on public.categories for insert  with check (auth.role() = 'authenticated');
create policy "Authenticated update categories" on public.categories for update  using (auth.role() = 'authenticated');
create policy "Authenticated delete categories" on public.categories for delete  using (auth.role() = 'authenticated');

-- 3. Products
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text    not null,
  price       numeric not null,
  category_id uuid    references public.categories on delete set null,
  emoji       text    not null default '',
  description text,
  available   boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.products enable row level security;
create policy "Authenticated read products"   on public.products for select  using (auth.role() = 'authenticated');
create policy "Authenticated insert products" on public.products for insert  with check (auth.role() = 'authenticated');
create policy "Authenticated update products" on public.products for update  using (auth.role() = 'authenticated');
create policy "Authenticated delete products" on public.products for delete  using (auth.role() = 'authenticated');

-- 4. Tables
create table if not exists public.restaurant_tables (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  status           text not null default 'libre' check (status in ('libre', 'ocupada', 'reservada')),
  current_order_id uuid,
  seats            integer not null default 4
);
alter table public.restaurant_tables enable row level security;
create policy "Authenticated read tables"   on public.restaurant_tables for select  using (auth.role() = 'authenticated');
create policy "Authenticated insert tables" on public.restaurant_tables for insert  with check (auth.role() = 'authenticated');
create policy "Authenticated update tables" on public.restaurant_tables for update  using (auth.role() = 'authenticated');
create policy "Authenticated delete tables" on public.restaurant_tables for delete  using (auth.role() = 'authenticated');

-- 5. Orders
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  table_id       text not null,
  table_name     text not null,
  status         text not null default 'pending'
                 check (status in ('pending','preparing','ready','delivered','completed','cancelled')),
  notes          text,
  subtotal       numeric not null,
  tax            numeric not null,
  total          numeric not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  preparing_at   timestamptz,
  ready_at       timestamptz,
  completed_at   timestamptz,
  created_by     uuid references auth.users,
  payment_method text check (payment_method in ('cash','card'))
);
alter table public.orders enable row level security;
create policy "Authenticated read orders"   on public.orders for select  using (auth.role() = 'authenticated');
create policy "Authenticated insert orders" on public.orders for insert  with check (auth.role() = 'authenticated');
create policy "Authenticated update orders" on public.orders for update  using (auth.role() = 'authenticated');

-- 6. Order Items
create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders on delete cascade,
  product_id   uuid,
  product_name text    not null,
  quantity     integer not null,
  unit_price   numeric not null,
  subtotal     numeric not null
);
alter table public.order_items enable row level security;
create policy "Authenticated read order_items"   on public.order_items for select  using (auth.role() = 'authenticated');
create policy "Authenticated insert order_items" on public.order_items for insert  with check (auth.role() = 'authenticated');

-- 7. Sales Summary
create table if not exists public.sales_summary (
  id          uuid primary key default gen_random_uuid(),
  date        date not null unique,
  revenue     numeric not null default 0,
  order_count integer not null default 0
);
alter table public.sales_summary enable row level security;
create policy "Authenticated read sales"   on public.sales_summary for select  using (auth.role() = 'authenticated');
create policy "Authenticated insert sales" on public.sales_summary for insert  with check (auth.role() = 'authenticated');
create policy "Authenticated update sales" on public.sales_summary for update  using (auth.role() = 'authenticated');

-- 8. Business Config (single row)
create table if not exists public.business_config (
  id            uuid primary key default gen_random_uuid(),
  business_name text    not null default 'Mi Restaurante',
  slogan        text    not null default '',
  currency      text    not null default 'MXN',
  tax_rate      numeric not null default 16,
  table_count   integer not null default 12
);
alter table public.business_config enable row level security;
create policy "Authenticated read config"   on public.business_config for select  using (auth.role() = 'authenticated');
create policy "Authenticated update config" on public.business_config for update  using (auth.role() = 'authenticated');
create policy "Authenticated insert config" on public.business_config for insert  with check (auth.role() = 'authenticated');

insert into public.business_config (business_name, slogan, currency, tax_rate, table_count)
values ('Mi Restaurante', 'Tu negocio, bajo control', 'MXN', 16, 12)
on conflict do nothing;

-- Realtime
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.restaurant_tables;

-- ============================================================
-- CREAR USUARIOS
-- Ejecuta este bloque por cada usuario que necesites.
-- El email DEBE ser: {username}@restauros.internal
-- Los metadatos se usan para popular la tabla profiles.
-- ============================================================
--
-- Ejemplo (ejecutar en SQL Editor):
--
-- select auth.create_user(
--   '{"email":"admin@restauros.internal","password":"tuPassword123","email_confirm":true,
--     "user_metadata":{"username":"admin","name":"Carlos Méndez","role":"admin"}}'::jsonb
-- );
--
-- select auth.create_user(
--   '{"email":"mesero@restauros.internal","password":"tuPassword123","email_confirm":true,
--     "user_metadata":{"username":"mesero","name":"Ana López","role":"mesero"}}'::jsonb
-- );
--
-- select auth.create_user(
--   '{"email":"cocina@restauros.internal","password":"tuPassword123","email_confirm":true,
--     "user_metadata":{"username":"cocina","name":"Pedro Ruiz","role":"cocina"}}'::jsonb
-- );
-- ============================================================

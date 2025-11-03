-- ============================================
-- SISTEMA DE ROLES DE USUARIO
-- ============================================
-- Este script crea la tabla de roles y políticas para gestión de permisos
-- Ejecutar en Supabase SQL Editor DESPUÉS de secure-rls-policies.sql
-- ============================================

-- 1. CREAR O ACTUALIZAR TABLA DE ROLES
-- ============================================

-- Si la tabla ya existe, agregar columna updated_at si no existe
do $$ 
begin
  -- Crear tabla si no existe
  create table if not exists public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role text not null check (role in ('admin', 'moderator', 'user')),
    created_at timestamp with time zone default now(),
    unique(user_id)
  );
  
  -- Agregar updated_at si no existe
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'user_roles' 
    and column_name = 'updated_at'
  ) then
    alter table public.user_roles 
    add column updated_at timestamp with time zone default now();
  end if;
end $$;

-- Índice para búsquedas rápidas
create index if not exists user_roles_user_id_idx on public.user_roles(user_id);
create index if not exists user_roles_role_idx on public.user_roles(role);

-- ============================================
-- 2. HABILITAR RLS
-- ============================================
alter table public.user_roles enable row level security;

-- ============================================
-- 3. POLÍTICAS RLS PARA user_roles
-- ============================================

-- 3.1. Los usuarios pueden ver su propio rol
drop policy if exists "Users can view own role" on public.user_roles;
create policy "Users can view own role"
  on public.user_roles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- 3.2. Solo admins pueden crear/modificar roles
drop policy if exists "Admins can manage all roles" on public.user_roles;
create policy "Admins can manage all roles"
  on public.user_roles
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================
-- 4. FUNCIÓN HELPER PARA VERIFICAR ROL
-- ============================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_moderator_or_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('admin', 'moderator')
  );
$$;

create or replace function public.get_user_role()
returns text
language sql
security definer
as $$
  select role from public.user_roles
  where user_id = auth.uid()
  limit 1;
$$;

-- ============================================
-- 5. ASIGNAR ROL DE ADMIN AL USUARIO EXISTENTE
-- ============================================
-- Reemplaza el email con el tuyo

insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where email = 'acgv.24.10@gmail.com'  -- ← Tu email de admin
on conflict (user_id) 
do update set role = 'admin', updated_at = now();

-- ============================================
-- 6. ACTUALIZAR POLÍTICAS DE CARDS PARA USAR ROLES
-- ============================================

-- Solo admins y moderators pueden actualizar cards
drop policy if exists "Authenticated users can update cards" on public.cards;
create policy "Admins and moderators can update cards"
  on public.cards
  for update
  to authenticated
  using (public.is_moderator_or_admin())
  with check (public.is_moderator_or_admin());

-- Solo admins pueden eliminar cards
drop policy if exists "Authenticated users can delete cards" on public.cards;
create policy "Only admins can delete cards"
  on public.cards
  for delete
  to authenticated
  using (public.is_admin());

-- ============================================
-- 7. VERIFICAR CONFIGURACIÓN
-- ============================================

-- Ver todos los usuarios con sus roles
select 
  u.email,
  r.role,
  r.created_at
from auth.users u
left join public.user_roles r on r.user_id = u.id
order by r.role desc, u.email;

-- Probar funciones helper
select 
  auth.uid() as "Mi User ID",
  public.get_user_role() as "Mi Rol",
  public.is_admin() as "¿Soy Admin?",
  public.is_moderator_or_admin() as "¿Soy Mod o Admin?";

-- ============================================
-- 8. POLÍTICAS PARA OTRAS TABLAS (OPCIONAL)
-- ============================================

-- Solo admins pueden ver logs
drop policy if exists "Authenticated users can view logs" on public.logs;
create policy "Only admins can view logs"
  on public.logs
  for select
  to authenticated
  using (public.is_admin());

-- Solo admins y moderators pueden gestionar submissions
drop policy if exists "Users can view own submissions" on public.submissions;
drop policy if exists "Authenticated users can update submissions" on public.submissions;

create policy "Mods and admins can view all submissions"
  on public.submissions
  for select
  to authenticated
  using (public.is_moderator_or_admin());

create policy "Mods and admins can update submissions"
  on public.submissions
  for update
  to authenticated
  using (public.is_moderator_or_admin());

-- ============================================
-- ✅ ROLES DEFINIDOS:
-- ============================================
-- admin:     Acceso completo (crear, editar, eliminar)
-- moderator: Puede editar y aprobar, no eliminar
-- user:      Solo puede ver (público)
--
-- Usa las funciones helper para verificar permisos:
-- - public.is_admin()
-- - public.is_moderator_or_admin()
-- - public.get_user_role()
-- ============================================


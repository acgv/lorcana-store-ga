-- ============================================
-- CREAR USUARIO ADMIN EN SUPABASE
-- ============================================
-- Este script crea un usuario admin para acceder al panel de administración
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ⚠️ IMPORTANTE: Reemplaza estos valores con tus datos reales
-- NO usar estos valores de ejemplo en producción
-- ============================================

-- OPCIÓN 1: Crear usuario admin directamente (más seguro)
-- ============================================
-- Nota: Reemplaza 'YOUR_ADMIN_EMAIL@example.com' y 'YOUR_SECURE_PASSWORD'

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'YOUR_ADMIN_EMAIL@example.com',  -- ← REEMPLAZAR: tu email real
  crypt('YOUR_SECURE_PASSWORD', gen_salt('bf')),  -- ← REEMPLAZAR: password seguro (12+ caracteres)
  now(),
  null,
  null,
  '{"provider":"email","providers":["email"]}',
  '{"role":"admin"}',  -- Metadata para identificar como admin
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- ============================================
-- OPCIÓN 2: Usar Supabase Dashboard (más fácil) ⭐ RECOMENDADO
-- ============================================
-- 1. Ve a Supabase Dashboard
-- 2. Authentication → Users
-- 3. Click "Add User"
-- 4. Email: tu-email@ejemplo.com (tu email real)
-- 5. Password: (un password seguro de 12+ caracteres)
-- 6. Auto Confirm User: ✅ (activar)
-- 7. Click "Create User"

-- ============================================
-- VERIFICAR USUARIO CREADO
-- ============================================
select 
  id,
  email,
  role,
  email_confirmed_at,
  created_at
from auth.users
where email = 'YOUR_ADMIN_EMAIL@example.com';  -- ← REEMPLAZAR: tu email

-- ============================================
-- (OPCIONAL) CREAR TABLA DE ROLES
-- ============================================
-- Si quieres gestionar roles de admin/user:

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('admin', 'user', 'moderator')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id)
);

-- Habilitar RLS
alter table public.user_roles enable row level security;

-- Política: Los usuarios pueden ver su propio rol
create policy "Users can view own role"
  on public.user_roles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Política: Solo admins pueden modificar roles
create policy "Only admins can manage roles"
  on public.user_roles
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Asignar rol de admin al usuario creado
insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where email = 'YOUR_ADMIN_EMAIL@example.com'  -- ← REEMPLAZAR: tu email
on conflict (user_id) do update set role = 'admin';

-- ============================================
-- VERIFICAR ROL ASIGNADO
-- ============================================
select 
  u.email,
  r.role,
  r.created_at
from auth.users u
join public.user_roles r on r.user_id = u.id
where u.email = 'YOUR_ADMIN_EMAIL@example.com';  -- ← REEMPLAZAR: tu email

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. Usa un password fuerte en producción (min 12 caracteres)
-- 2. Habilita 2FA en Supabase para usuarios admin
-- 3. No compartas las credenciales de admin
-- 4. Cambia el password regularmente
-- 5. Revisa logs de acceso regularmente
-- ============================================

-- ============================================
-- ELIMINAR USUARIO (SI ES NECESARIO)
-- ============================================
-- Solo usar si creaste el usuario por error:
/*
delete from auth.users 
where email = 'YOUR_ADMIN_EMAIL@example.com';  -- ← REEMPLAZAR: tu email
*/


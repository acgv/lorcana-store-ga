-- Script para habilitar actualizaciones de stock en Supabase
-- Ejecutar esto en Supabase SQL Editor

-- 1. Eliminar política si existe (para recrearla)
drop policy if exists "Allow update stock" on public.cards;

-- 2. Crear política para permitir UPDATE en cards
-- Esta política permite actualizar cualquier campo de la tabla cards
create policy "Allow update stock"
  on public.cards
  for update
  to anon, authenticated
  using (true)
  with check (true);

-- 3. Verificar que RLS esté habilitado
alter table public.cards enable row level security;

-- 4. Verificar políticas existentes
select 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where tablename = 'cards'
order by policyname;


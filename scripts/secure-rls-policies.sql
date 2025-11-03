-- ============================================
-- POLÍTICAS RLS SEGURAS PARA LORCANA STORE
-- ============================================
-- Este script implementa políticas de seguridad Row Level Security (RLS)
-- para proteger la base de datos de accesos no autorizados.
--
-- IMPORTANTE: Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. ELIMINAR POLÍTICAS INSEGURAS EXISTENTES
-- ============================================
drop policy if exists "Allow update stock" on public.cards;
drop policy if exists "Read approved cards" on public.cards;
drop policy if exists "Allow all operations on submissions" on public.submissions;
drop policy if exists "Allow all operations on logs" on public.logs;

-- 2. HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================
alter table public.cards enable row level security;
alter table public.submissions enable row level security;
alter table public.logs enable row level security;

-- 3. POLÍTICAS PARA TABLA: cards
-- ============================================

-- 3.1. Permitir lectura pública SOLO de cartas aprobadas
create policy "Public read approved cards"
  on public.cards
  for select
  to anon, authenticated
  using (status = 'approved');

-- 3.2. Permitir INSERT solo a usuarios autenticados
create policy "Authenticated users can create cards"
  on public.cards
  for insert
  to authenticated
  with check (true);

-- 3.3. Permitir UPDATE solo a usuarios autenticados
-- NOTA: En producción, esto debería restringirse solo a rol 'admin'
create policy "Authenticated users can update cards"
  on public.cards
  for update
  to authenticated
  using (true)
  with check (true);

-- 3.4. Permitir DELETE solo a usuarios autenticados
create policy "Authenticated users can delete cards"
  on public.cards
  for delete
  to authenticated
  using (true);

-- 4. POLÍTICAS PARA TABLA: submissions
-- ============================================

-- 4.1. Los usuarios autenticados pueden ver sus propias submissions
create policy "Users can view own submissions"
  on public.submissions
  for select
  to authenticated
  using (auth.uid()::text = submittedBy);

-- 4.2. Los usuarios autenticados pueden crear submissions
create policy "Users can create submissions"
  on public.submissions
  for insert
  to authenticated
  with check (auth.uid()::text = submittedBy);

-- 4.3. Solo usuarios autenticados pueden actualizar submissions
create policy "Authenticated users can update submissions"
  on public.submissions
  for update
  to authenticated
  using (true);

-- 5. POLÍTICAS PARA TABLA: logs
-- ============================================

-- 5.1. Solo usuarios autenticados pueden ver logs
create policy "Authenticated users can view logs"
  on public.logs
  for select
  to authenticated
  using (true);

-- 5.2. Solo usuarios autenticados pueden crear logs
create policy "Authenticated users can create logs"
  on public.logs
  for insert
  to authenticated
  with check (true);

-- 6. WORKAROUND TEMPORAL PARA DESARROLLO SIN AUTH
-- ============================================
-- ADVERTENCIA: Estas políticas permiten actualizaciones sin autenticación
-- SOLO PARA DESARROLLO. ELIMINAR EN PRODUCCIÓN.
-- ============================================

-- Si necesitas permitir actualizaciones durante desarrollo sin auth,
-- descomenta las siguientes líneas (NO RECOMENDADO para producción):

/*
drop policy if exists "Authenticated users can update cards" on public.cards;

create policy "DEV ONLY - Allow anonymous updates"
  on public.cards
  for update
  to anon
  using (true)
  with check (true);

-- Agregar un comentario visible en la tabla
comment on policy "DEV ONLY - Allow anonymous updates" on public.cards is 
  'INSEGURO: Solo para desarrollo. Eliminar antes de producción.';
*/

-- 7. VERIFICAR POLÍTICAS CONFIGURADAS
-- ============================================
select 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
from pg_policies
where schemaname = 'public'
  and tablename in ('cards', 'submissions', 'logs')
order by tablename, policyname;

-- 8. VERIFICAR QUE RLS ESTÉ HABILITADO
-- ============================================
select 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
  and tablename in ('cards', 'submissions', 'logs');

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Estas políticas requieren Supabase Auth configurado
-- 2. Para desarrollo sin auth, descomenta la sección "WORKAROUND TEMPORAL"
-- 3. En producción, implementa roles de usuario (admin, user)
-- 4. Considera crear una tabla 'user_roles' para gestión de permisos
-- 5. Las actualizaciones de inventario deberían usar service_role key en backend
-- ============================================


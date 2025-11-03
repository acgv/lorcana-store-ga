-- ============================================
-- TABLA DE ÓRDENES DE COMPRA
-- ============================================
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. CREAR TABLA DE ÓRDENES
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  
  -- Información del pago
  payment_id text unique not null,
  external_reference text,
  status text not null check (status in ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),
  
  -- Información del cliente
  customer_email text,
  customer_name text,
  
  -- Detalles de la compra
  items jsonb not null, -- Array de items comprados
  total_amount decimal(10,2) not null,
  currency text default 'CLP',
  
  -- Metadata
  payment_method text,
  payment_type text,
  
  -- Timestamps
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  paid_at timestamp with time zone
);

-- 2. ÍNDICES PARA BÚSQUEDAS RÁPIDAS
create index if not exists orders_payment_id_idx on public.orders(payment_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_customer_email_idx on public.orders(customer_email);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

-- 3. HABILITAR RLS
alter table public.orders enable row level security;

-- 4. POLÍTICAS RLS

-- Los usuarios pueden ver sus propias órdenes (por email)
drop policy if exists "Users can view own orders" on public.orders;
create policy "Users can view own orders"
  on public.orders
  for select
  to authenticated
  using (auth.jwt() ->> 'email' = customer_email);

-- Solo admins pueden ver todas las órdenes
drop policy if exists "Admins can view all orders" on public.orders;
create policy "Admins can view all orders"
  on public.orders
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Solo el sistema (service role) puede crear/actualizar órdenes
-- Esto se hace desde los webhooks con supabaseAdmin
drop policy if exists "Service role can manage orders" on public.orders;
create policy "Service role can manage orders"
  on public.orders
  for all
  using (true);

-- 5. TRIGGER PARA UPDATED_AT
create or replace function public.update_orders_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_orders_updated_at on public.orders;
create trigger update_orders_updated_at
  before update on public.orders
  for each row
  execute function public.update_orders_updated_at();

-- 6. COMENTARIOS
comment on table public.orders is 'Órdenes de compra procesadas por Mercado Pago';
comment on column public.orders.payment_id is 'ID del pago en Mercado Pago';
comment on column public.orders.external_reference is 'Referencia externa generada por nosotros';
comment on column public.orders.items is 'Array JSON con las cartas compradas';
comment on column public.orders.status is 'Estado del pago: pending, approved, rejected, cancelled, refunded';

-- ============================================
-- VERIFICAR TABLA CREADA
-- ============================================
select 
  column_name, 
  data_type, 
  is_nullable
from information_schema.columns
where table_schema = 'public' 
  and table_name = 'orders'
order by ordinal_position;

-- ============================================
-- CONSULTAS ÚTILES
-- ============================================

-- Ver todas las órdenes
-- select * from public.orders order by created_at desc;

-- Ver órdenes aprobadas
-- select * from public.orders where status = 'approved' order by created_at desc;

-- Ver órdenes por cliente
-- select * from public.orders where customer_email = 'cliente@ejemplo.com';

-- Total de ventas
-- select 
--   count(*) as total_orders,
--   sum(total_amount) as total_revenue
-- from public.orders
-- where status = 'approved';


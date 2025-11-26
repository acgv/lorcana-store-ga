-- Agregar política RLS para INSERT en la tabla products
-- Ejecutar en Supabase SQL Editor

-- Policy: Allow admin/service role to insert products
DROP POLICY IF EXISTS "Admin can insert products" ON public.products;
CREATE POLICY "Admin can insert products"
  ON public.products
  FOR INSERT
  WITH CHECK (true);

-- Comentario
COMMENT ON POLICY "Admin can insert products" ON public.products IS 'Permite insertar productos usando service role (bypass RLS)';


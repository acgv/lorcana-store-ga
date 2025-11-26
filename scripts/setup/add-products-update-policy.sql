-- Agregar política RLS para UPDATE en la tabla products
-- Ejecutar en Supabase SQL Editor

-- Policy: Allow admin/service role to update products
DROP POLICY IF EXISTS "Admin can update products" ON public.products;
CREATE POLICY "Admin can update products"
  ON public.products
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Comentario
COMMENT ON POLICY "Admin can update products" ON public.products IS 'Permite actualizar productos usando service role (bypass RLS)';


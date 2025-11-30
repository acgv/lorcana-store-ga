-- Fix RLS policy for price_calculation_settings table (SIMPLE VERSION)
-- This script fixes the 42703 error by creating a policy that allows service role
-- and also allows admins via user_roles check

-- Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "Admins can manage price calculation settings" ON public.price_calculation_settings;
DROP POLICY IF EXISTS "price_calculation_settings_policy" ON public.price_calculation_settings;
DROP POLICY IF EXISTS "Users can view price calculation settings" ON public.price_calculation_settings;
DROP POLICY IF EXISTS "Users can update price calculation settings" ON public.price_calculation_settings;

-- Crear política que permite service role (current_setting('role') = 'service_role')
-- y también permite admins verificando user_roles
CREATE POLICY "Admins can manage price calculation settings"
ON public.price_calculation_settings
FOR ALL
USING (
  -- Permitir service role (bypass RLS)
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR
  -- Permitir admins verificando user_roles
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  -- Misma lógica para WITH CHECK
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);


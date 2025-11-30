-- Fix RLS policy for price_calculation_settings table
-- This script fixes the 42703 error by removing any policies that use is_admin()
-- and creating a new policy that works without is_admin()

-- Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "Admins can manage price calculation settings" ON public.price_calculation_settings;
DROP POLICY IF EXISTS "price_calculation_settings_policy" ON public.price_calculation_settings;
DROP POLICY IF EXISTS "Users can view price calculation settings" ON public.price_calculation_settings;
DROP POLICY IF EXISTS "Users can update price calculation settings" ON public.price_calculation_settings;

-- Verificar si la tabla user_roles existe antes de crear la política
DO $$
BEGIN
  -- Verificar si user_roles existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_roles'
  ) THEN
    -- Crear política usando verificación directa en user_roles (sin is_admin())
    EXECUTE 'CREATE POLICY "Admins can manage price calculation settings"
      ON public.price_calculation_settings
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_roles.user_id = auth.uid()
          AND user_roles.role = ''admin''
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_roles.user_id = auth.uid()
          AND user_roles.role = ''admin''
        )
      )';
  ELSE
    -- Si user_roles no existe, crear política permisiva (solo para desarrollo)
    RAISE NOTICE 'Tabla user_roles no existe. Creando política permisiva (solo para desarrollo).';
    EXECUTE 'CREATE POLICY "Admins can manage price calculation settings"
      ON public.price_calculation_settings
      FOR ALL
      USING (true)
      WITH CHECK (true)';
  END IF;
END $$;


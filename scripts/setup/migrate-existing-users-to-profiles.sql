-- ============================================
-- MIGRAR USUARIOS EXISTENTES A USER_PROFILES
-- ============================================
-- Este script migra los datos de usuarios existentes desde auth.users
-- a la tabla user_profiles para regularizar la información
--
-- Fuentes de datos:
-- 1. auth.users.user_metadata (name, full_name)
-- 2. orders.customer_name (si existe información adicional)
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT/editor
-- ============================================

-- Función helper para dividir nombre completo en first_name y last_name
CREATE OR REPLACE FUNCTION split_name(full_name TEXT)
RETURNS TABLE(first_name TEXT, last_name TEXT) AS $$
BEGIN
  IF full_name IS NULL OR full_name = '' THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Dividir por espacios
  DECLARE
    parts TEXT[];
    name_parts TEXT[];
  BEGIN
    parts := string_to_array(trim(full_name), ' ');
    
    -- Si tiene 1 parte, es first_name
    IF array_length(parts, 1) = 1 THEN
      RETURN QUERY SELECT parts[1], NULL::TEXT;
    -- Si tiene 2 partes, primera es first_name, segunda es last_name
    ELSIF array_length(parts, 1) = 2 THEN
      RETURN QUERY SELECT parts[1], parts[2];
    -- Si tiene más partes, primera es first_name, resto es last_name
    ELSE
      RETURN QUERY 
        SELECT parts[1], array_to_string(parts[2:array_length(parts, 1)], ' ');
    END IF;
  END;
END;
$$ LANGUAGE plpgsql;

-- Migrar datos desde auth.users
-- Toma el nombre de user_metadata (name o full_name)
INSERT INTO public.user_profiles (user_id, first_name, last_name)
SELECT 
  u.id as user_id,
  split.first_name,
  split.last_name
FROM auth.users u
CROSS JOIN LATERAL split_name(
  COALESCE(
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'full_name',
    NULL
  )
) AS split
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles up 
  WHERE up.user_id = u.id
)
AND (
  u.raw_user_meta_data->>'name' IS NOT NULL 
  OR u.raw_user_meta_data->>'full_name' IS NOT NULL
);

-- Actualizar perfiles existentes con nombres de órdenes si no tienen nombre
-- (Solo si el perfil no tiene first_name o last_name)
UPDATE public.user_profiles up
SET 
  first_name = COALESCE(
    up.first_name,
    split.first_name
  ),
  last_name = COALESCE(
    up.last_name,
    split.last_name
  )
FROM (
  SELECT DISTINCT ON (customer_email)
    customer_email,
    customer_name
  FROM public.orders
  WHERE customer_name IS NOT NULL
    AND customer_name != ''
  ORDER BY customer_email, created_at DESC
) o
CROSS JOIN LATERAL split_name(o.customer_name) AS split
INNER JOIN auth.users u ON u.email = o.customer_email
WHERE up.user_id = u.id
  AND (up.first_name IS NULL OR up.last_name IS NULL)
  AND split.first_name IS NOT NULL;

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver cuántos perfiles se crearon/actualizaron
SELECT 
  COUNT(*) as total_profiles,
  COUNT(first_name) as profiles_with_first_name,
  COUNT(last_name) as profiles_with_last_name,
  COUNT(*) FILTER (WHERE first_name IS NOT NULL AND last_name IS NOT NULL) as complete_profiles
FROM public.user_profiles;

-- Ver perfiles creados con sus datos
SELECT 
  up.user_id,
  u.email,
  up.first_name,
  up.last_name,
  up.created_at
FROM public.user_profiles up
INNER JOIN auth.users u ON u.id = up.user_id
ORDER BY up.created_at DESC;

-- Ver usuarios sin perfil (si los hay)
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'name' as metadata_name,
  u.raw_user_meta_data->>'full_name' as metadata_full_name
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles up WHERE up.user_id = u.id
)
AND u.email IS NOT NULL;

-- ============================================
-- NOTAS
-- ============================================
-- 1. El script crea perfiles solo para usuarios que tienen nombre en user_metadata
-- 2. Si un usuario ya tiene perfil, no se duplica
-- 3. Si un perfil existe pero no tiene nombre, se actualiza con datos de órdenes
-- 4. La función split_name divide nombres completos en first_name y last_name
-- 5. Si el nombre tiene más de 2 palabras, la primera es first_name y el resto es last_name
-- ============================================


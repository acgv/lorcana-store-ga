-- Corregir trigger updatedAt para tabla products
-- Ejecutar en Supabase SQL Editor

-- Primero, verificar el nombre real de la columna
-- Si la columna se llama "updatedAt" (camelCase), necesitamos un trigger específico
-- Si se llama "updated_at" (snake_case), el trigger genérico debería funcionar

-- Opción 1: Si la columna es "updatedAt" (camelCase)
-- Crear función específica para products
CREATE OR REPLACE FUNCTION public.set_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Intentar actualizar updatedAt (camelCase)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'products' 
             AND column_name = 'updatedAt') THEN
    NEW."updatedAt" = now();
  -- Si no existe, intentar updated_at (snake_case)
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'products' 
                AND column_name = 'updated_at') THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger antiguo si existe
DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;

-- Crear nuevo trigger usando la función específica
CREATE TRIGGER set_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE PROCEDURE public.set_products_updated_at();

-- También asegurarnos de que la columna existe con el nombre correcto
-- Si no existe, crearla
DO $$
BEGIN
  -- Verificar si existe updatedAt (camelCase)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'products' 
                 AND column_name = 'updatedAt') THEN
    -- Si no existe updatedAt, verificar si existe updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'products' 
                   AND column_name = 'updated_at') THEN
      -- Si no existe ninguna, crear updatedAt
      ALTER TABLE public.products ADD COLUMN "updatedAt" timestamptz DEFAULT now();
    END IF;
  END IF;
END $$;

-- Agregar política RLS para UPDATE (si no existe)
DROP POLICY IF EXISTS "Admin can update products" ON public.products;
CREATE POLICY "Admin can update products"
  ON public.products
  FOR UPDATE
  USING (true)
  WITH CHECK (true);


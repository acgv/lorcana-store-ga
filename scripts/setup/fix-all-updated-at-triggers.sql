-- Corregir triggers updatedAt para todas las tablas (products y cards)
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- 1. ARREGLAR TRIGGER PARA PRODUCTS
-- ============================================

-- Eliminar todos los triggers antiguos relacionados con updatedAt
DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
DROP TRIGGER IF EXISTS set_updated_at ON public.products;
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;

-- Eliminar funciones antiguas si existen
DROP FUNCTION IF EXISTS public.set_products_updated_at();
DROP FUNCTION IF EXISTS public.update_products_updated_at();

-- Crear función específica para products que detecta automáticamente el nombre de la columna
CREATE OR REPLACE FUNCTION public.set_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Intentar actualizar updatedAt (camelCase) si existe
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

-- Crear trigger para products
CREATE TRIGGER set_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.set_products_updated_at();

-- ============================================
-- 2. ARREGLAR TRIGGER PARA CARDS
-- ============================================

-- Eliminar todos los triggers antiguos relacionados con updatedAt
DROP TRIGGER IF EXISTS set_cards_updated_at ON public.cards;
DROP TRIGGER IF EXISTS set_updated_at ON public.cards;
DROP TRIGGER IF EXISTS update_cards_updated_at ON public.cards;

-- Eliminar funciones antiguas si existen
DROP FUNCTION IF EXISTS public.set_cards_updated_at();
DROP FUNCTION IF EXISTS public.update_cards_updated_at();

-- Crear función específica para cards que detecta automáticamente el nombre de la columna
CREATE OR REPLACE FUNCTION public.set_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Intentar actualizar updatedAt (camelCase) si existe
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'cards' 
             AND column_name = 'updatedAt') THEN
    NEW."updatedAt" = now();
  -- Si no existe, intentar updated_at (snake_case)
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'cards' 
                AND column_name = 'updated_at') THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para cards
CREATE TRIGGER set_cards_updated_at
BEFORE UPDATE ON public.cards
FOR EACH ROW
EXECUTE FUNCTION public.set_cards_updated_at();

-- ============================================
-- 3. VERIFICAR Y CREAR COLUMNAS SI NO EXISTEN
-- ============================================

-- Para products
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

-- Para cards
DO $$
BEGIN
  -- Verificar si existe updatedAt (camelCase)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'cards' 
                 AND column_name = 'updatedAt') THEN
    -- Si no existe updatedAt, verificar si existe updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'cards' 
                   AND column_name = 'updated_at') THEN
      -- Si no existe ninguna, crear updatedAt
      ALTER TABLE public.cards ADD COLUMN "updatedAt" timestamptz DEFAULT now();
    END IF;
  END IF;
END $$;

-- ============================================
-- 4. VERIFICAR POLÍTICAS RLS
-- ============================================

-- Política para UPDATE en products
DROP POLICY IF EXISTS "Admin can update products" ON public.products;
CREATE POLICY "Admin can update products"
  ON public.products
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Política para UPDATE en cards (si no existe)
DROP POLICY IF EXISTS "Admin can update cards" ON public.cards;
CREATE POLICY "Admin can update cards"
  ON public.cards
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Comentarios
COMMENT ON FUNCTION public.set_products_updated_at() IS 'Trigger function para actualizar updatedAt/updated_at en tabla products';
COMMENT ON FUNCTION public.set_cards_updated_at() IS 'Trigger function para actualizar updatedAt/updated_at en tabla cards';
COMMENT ON TRIGGER set_products_updated_at ON public.products IS 'Actualiza automáticamente updatedAt/updated_at antes de UPDATE';
COMMENT ON TRIGGER set_cards_updated_at ON public.cards IS 'Actualiza automáticamente updatedAt/updated_at antes de UPDATE';


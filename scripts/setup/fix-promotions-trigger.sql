-- Fix trigger para promotions table
-- La función set_updated_at() usa "updatedAt" pero promotions tiene "updated_at"
-- Necesitamos crear una función específica o actualizar la función existente

-- Opción 1: Crear función específica para promotions que use updated_at
CREATE OR REPLACE FUNCTION public.set_promotions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger existente
DROP TRIGGER IF EXISTS set_promotions_updated_at ON public.promotions;

-- Crear trigger con la función correcta
CREATE TRIGGER set_promotions_updated_at
BEFORE UPDATE ON public.promotions
FOR EACH ROW
EXECUTE FUNCTION public.set_promotions_updated_at();


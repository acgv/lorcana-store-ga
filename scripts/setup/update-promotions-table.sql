-- Script para actualizar la tabla de promociones con nuevos campos de descuento
-- Ejecutar este script si ya tienes la tabla creada

-- Agregar nuevas columnas si no existen
ALTER TABLE public.promotions
ADD COLUMN IF NOT EXISTS discount_minimum_amount numeric DEFAULT 0;

ALTER TABLE public.promotions
ADD COLUMN IF NOT EXISTS shipping_discount_percentage integer DEFAULT 0;

ALTER TABLE public.promotions
ADD COLUMN IF NOT EXISTS free_shipping boolean DEFAULT false;

ALTER TABLE public.promotions
ADD COLUMN IF NOT EXISTS free_shipping_minimum_amount numeric DEFAULT 0;

-- Actualizar comentarios
COMMENT ON COLUMN public.promotions.discount_minimum_amount IS 'Monto mínimo en CLP para aplicar descuento en productos';
COMMENT ON COLUMN public.promotions.shipping_discount_percentage IS 'Porcentaje de descuento en envío (0-100)';
COMMENT ON COLUMN public.promotions.free_shipping IS 'Si el envío es gratis cuando se cumple el monto mínimo';
COMMENT ON COLUMN public.promotions.free_shipping_minimum_amount IS 'Monto mínimo en CLP para envío gratis';


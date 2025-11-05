-- ============================================
-- AGREGAR COLUMNAS DE FEES A LA TABLA ORDERS
-- ============================================
-- Este script agrega campos para guardar los fees reales de Mercado Pago
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Agregar columnas para fees de Mercado Pago
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS mp_fee_amount decimal(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_received_amount decimal(10,2) DEFAULT 0;

-- Comentarios para documentar las columnas
COMMENT ON COLUMN public.orders.mp_fee_amount IS 'Fee cobrado por Mercado Pago (de fee_details[0].amount)';
COMMENT ON COLUMN public.orders.net_received_amount IS 'Monto neto recibido después de fees (de transaction_details.net_received_amount)';

-- Verificar que las columnas se agregaron correctamente
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' 
  AND column_name IN ('mp_fee_amount', 'net_received_amount')
ORDER BY ordinal_position;

-- Ejemplo de datos que se guardarán:
-- total_amount: 450 (lo que pagó el cliente)
-- mp_fee_amount: 17 (comisión de Mercado Pago)
-- net_received_amount: 433 (lo que recibimos)


-- Forzar a PostgREST a recargar el schema cache
-- Ejecuta esto en Supabase SQL Editor

-- Método 1: Notificar a PostgREST (puede no funcionar en Supabase Cloud)
NOTIFY pgrst, 'reload schema';

-- Método 2: Verificar que la columna existe y tiene datos
SELECT 
  COUNT(*) as total_cartas,
  COUNT("inkColor") as cartas_con_inkColor,
  COUNT(*) - COUNT("inkColor") as cartas_sin_inkColor
FROM cards
WHERE status = 'approved';

-- Método 3: Verificar una carta específica
SELECT 
  id,
  name,
  "inkColor"
FROM cards
WHERE id = 'fab-94';

-- Método 4: Verificar si PostgREST puede acceder a la columna
-- Esta query debería funcionar a través de PostgREST
SELECT 
  id,
  name,
  "inkColor"
FROM cards
WHERE "inkColor" IS NOT NULL
LIMIT 5;


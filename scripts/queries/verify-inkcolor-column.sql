-- Verificar si la columna inkColor existe y tiene datos
-- Ejecuta esto en Supabase SQL Editor

-- 1. Verificar si la columna existe
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'cards' 
  AND column_name = 'inkColor';

-- 2. Si la columna existe, ver cuántas cartas tienen color
SELECT 
  COUNT(*) as total_cartas,
  COUNT("inkColor") as cartas_con_color,
  COUNT(*) - COUNT("inkColor") as cartas_sin_color,
  COUNT(DISTINCT "inkColor") as colores_unicos
FROM cards
WHERE status = 'approved';

-- 3. Ver los colores únicos que existen
SELECT DISTINCT "inkColor"
FROM cards
WHERE status = 'approved' 
  AND "inkColor" IS NOT NULL 
  AND "inkColor" != ''
ORDER BY "inkColor";

-- 4. Ver ejemplos de cartas con color
SELECT 
  id,
  name,
  set,
  "inkColor"
FROM cards
WHERE status = 'approved' 
  AND "inkColor" IS NOT NULL 
  AND "inkColor" != ''
LIMIT 10;


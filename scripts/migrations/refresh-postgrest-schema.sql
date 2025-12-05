-- Forzar a PostgREST a recargar el schema cache
-- Esto es necesario cuando se agregan nuevas columnas
-- Ejecuta esto en Supabase SQL Editor

-- Notificar a PostgREST que recargue el schema
NOTIFY pgrst, 'reload schema';

-- Verificar que la columna inkColor existe y es accesible
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'cards' 
  AND column_name IN ('inkColor', 'inkcolor', '"inkColor"')
ORDER BY column_name;

-- Probar una query directa para verificar que PostgREST puede acceder a la columna
SELECT 
  id,
  name,
  "inkColor"
FROM cards
WHERE "inkColor" IS NOT NULL
LIMIT 5;


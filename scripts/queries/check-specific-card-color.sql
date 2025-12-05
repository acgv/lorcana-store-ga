-- Verificar si una carta específica tiene color
-- Reemplaza 'fab-94' con el ID de la carta que quieras verificar

SELECT 
  id,
  name,
  set,
  "inkColor",
  color
FROM cards
WHERE id = 'fab-94'  -- ⚠️ Cambia esto por el ID de la carta que quieras verificar
LIMIT 1;

-- Ver todas las cartas del set "fabled" que tienen color
SELECT 
  id,
  name,
  set,
  "inkColor"
FROM cards
WHERE set = 'fabled'
  AND "inkColor" IS NOT NULL 
  AND "inkColor" != ''
ORDER BY name
LIMIT 20;


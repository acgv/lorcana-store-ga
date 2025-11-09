-- ============================================
-- ESTANDARIZAR TODOS LOS PRECIOS POR RAREZA
-- ============================================
-- ⚠️ ADVERTENCIA: Este script actualiza TODAS las cartas
-- incluyendo las que YA tienen precio configurado.
--
-- Úsalo para mantener un estándar consistente basado
-- en rareza en todo tu catálogo.
-- ============================================

-- ============================================
-- PASO 1: BACKUP (Opcional pero recomendado)
-- ============================================
-- Ejecuta esto primero para guardar los precios actuales:
/*
CREATE TABLE IF NOT EXISTS backup_prices_2025_11_09 AS
SELECT 
  id,
  name,
  rarity,
  price as old_price,
  "foilPrice" as old_foil_price,
  "updatedAt"
FROM public.cards;
*/

-- Para restaurar después (si es necesario):
/*
UPDATE public.cards c
SET 
  price = b.old_price,
  "foilPrice" = b.old_foil_price
FROM backup_prices_2025_11_09 b
WHERE c.id = b.id;
*/

-- ============================================
-- PASO 2: APLICAR PRECIOS ESTÁNDAR
-- ============================================

-- Actualizar TODAS las COMMON
UPDATE public.cards
SET 
  price = 500,
  "foilPrice" = 500,
  "updatedAt" = NOW()
WHERE rarity = 'Common';

-- Actualizar TODAS las UNCOMMON
UPDATE public.cards
SET 
  price = 1000,
  "foilPrice" = 1000,
  "updatedAt" = NOW()
WHERE rarity = 'Uncommon';

-- Actualizar TODAS las RARE
UPDATE public.cards
SET 
  price = 2500,
  "foilPrice" = 4000,
  "updatedAt" = NOW()
WHERE rarity = 'Rare';

-- Actualizar TODAS las SUPER RARE
UPDATE public.cards
SET 
  price = 5000,
  "foilPrice" = 8000,
  "updatedAt" = NOW()
WHERE rarity = 'Super Rare';

-- Actualizar TODAS las LEGENDARY
UPDATE public.cards
SET 
  price = 30000,
  "foilPrice" = 50000,
  "updatedAt" = NOW()
WHERE rarity = 'Legendary';

-- ============================================
-- PASO 3: VERIFICACIÓN
-- ============================================

-- Resumen por rareza
SELECT 
  rarity,
  COUNT(*) as total_cartas,
  MIN(price) as precio_min,
  MAX(price) as precio_max,
  AVG(price)::INTEGER as precio_promedio,
  MIN("foilPrice") as foil_min,
  MAX("foilPrice") as foil_max,
  AVG("foilPrice")::INTEGER as foil_promedio
FROM public.cards
GROUP BY rarity
ORDER BY 
  CASE rarity
    WHEN 'Common' THEN 1
    WHEN 'Uncommon' THEN 2
    WHEN 'Rare' THEN 3
    WHEN 'Super Rare' THEN 4
    WHEN 'Legendary' THEN 5
    ELSE 6
  END;

-- Ver ejemplos de cada rareza
SELECT 
  name,
  rarity,
  price as precio_normal,
  "foilPrice" as precio_foil,
  "normalStock",
  "foilStock"
FROM public.cards
WHERE rarity IN ('Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary')
ORDER BY 
  CASE rarity
    WHEN 'Common' THEN 1
    WHEN 'Uncommon' THEN 2
    WHEN 'Rare' THEN 3
    WHEN 'Super Rare' THEN 4
    WHEN 'Legendary' THEN 5
  END,
  name
LIMIT 25;

-- Verificar consistencia (todas las cartas de misma rareza = mismo precio)
SELECT 
  rarity,
  COUNT(DISTINCT price) as precios_diferentes_normal,
  COUNT(DISTINCT "foilPrice") as precios_diferentes_foil,
  CASE 
    WHEN COUNT(DISTINCT price) = 1 AND COUNT(DISTINCT "foilPrice") = 1 
    THEN '✅ CONSISTENTE'
    ELSE '⚠️ INCONSISTENTE'
  END as estado
FROM public.cards
GROUP BY rarity;

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
--
-- Todas las cartas de la misma rareza tendrán:
-- ✅ Mismo precio normal
-- ✅ Mismo precio foil
-- ✅ Estándar consistente
--
-- Puedes ajustar INDIVIDUALMENTE después desde:
-- /admin/inventory
--
-- ============================================

-- ============================================
-- TOTAL DE CARTAS ACTUALIZADAS
-- ============================================
SELECT 
  COUNT(*) as total_cartas_actualizadas,
  COUNT(CASE WHEN "normalStock" > 0 THEN 1 END) as con_stock_normal,
  COUNT(CASE WHEN "foilStock" > 0 THEN 1 END) as con_stock_foil,
  COUNT(CASE WHEN "normalStock" = 0 AND "foilStock" = 0 THEN 1 END) as sin_stock
FROM public.cards
WHERE "updatedAt" > NOW() - INTERVAL '5 minutes';

-- ============================================
-- NOTAS FINALES
-- ============================================
-- 
-- ✅ Ahora tienes un catálogo con precios consistentes
-- ✅ Todas las cartas tienen precio (aunque no tengan stock)
-- ✅ Fácil de mantener y explicar a clientes
-- ✅ Puedes ajustar casos especiales manualmente
--
-- Próximos pasos recomendados:
-- 1. Ve a /admin/inventory
-- 2. Filtra por "Legendary" 
-- 3. Ajusta manualmente las ~37 legendarias según demanda
-- 4. Filtra por "Super Rare" populares
-- 5. Ajusta según tu conocimiento del mercado
--
-- ============================================


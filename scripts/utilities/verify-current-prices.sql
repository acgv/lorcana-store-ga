-- ============================================
-- VERIFICAR PRECIOS ACTUALES
-- ============================================
-- Esta query muestra el estado actual de precios
-- sin depender del campo updatedAt
-- ============================================

-- Ver distribución de precios por rareza
SELECT 
  rarity,
  COUNT(*) as total_cartas,
  COUNT(DISTINCT price) as precios_diferentes_normal,
  COUNT(DISTINCT "foilPrice") as precios_diferentes_foil,
  MIN(price) as min_price,
  MAX(price) as max_price,
  ROUND(AVG(price)) as avg_price,
  MIN("foilPrice") as min_foil,
  MAX("foilPrice") as max_foil,
  ROUND(AVG("foilPrice")) as avg_foil
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

-- ============================================
-- INTERPRETACIÓN:
-- ============================================
--
-- Si el script funcionó, verás:
-- ✅ Common: min_price = 500, max_price = 500 (todas iguales)
-- ✅ Uncommon: min_price = 1000, max_price = 1000
-- ✅ Rare: min_price = 2500, max_price = 2500
-- ✅ Super Rare: min_price = 5000, max_price = 5000
-- ✅ Legendary: min_price = 30000, max_price = 30000
--
-- Si NO funcionó, verás:
-- ❌ Múltiples precios diferentes por rareza
-- ❌ min_price ≠ max_price
-- ❌ Valores en 0 o NULL
-- ============================================

-- Ver ejemplos de cada rareza
SELECT 
  rarity,
  name,
  price,
  "foilPrice",
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
LIMIT 30;

-- ============================================


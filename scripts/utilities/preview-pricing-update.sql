-- ============================================
-- PREVIEW: Cuántas cartas se actualizarán por rareza
-- ============================================
-- Ejecuta esto PRIMERO para ver el impacto
-- NO modifica nada, solo muestra información
-- ============================================

-- Ver cuántas cartas por rareza NO tienen precio
SELECT 
  rarity,
  COUNT(*) as total_cards,
  COUNT(CASE WHEN price = 0 OR price IS NULL THEN 1 END) as sin_precio_normal,
  COUNT(CASE WHEN "foilPrice" = 0 OR "foilPrice" IS NULL THEN 1 END) as sin_precio_foil
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

-- Ver ejemplos de cartas que se actualizarían
SELECT 
  id,
  name,
  rarity,
  price as precio_actual_normal,
  "foilPrice" as precio_actual_foil,
  "normalStock",
  "foilStock"
FROM public.cards
WHERE (price = 0 OR price IS NULL OR "foilPrice" = 0 OR "foilPrice" IS NULL)
LIMIT 10;

-- ============================================
-- ANÁLISIS DE IMPACTO
-- ============================================
-- Después de revisar los resultados arriba, decide:
--
-- ¿Los números tienen sentido?
-- ¿Las rarezas están correctas?
-- ¿Quieres proceder con el update?
--
-- Si SÍ → Ejecuta: apply-pricing-by-rarity.sql
-- Si NO → Ajusta los precios en ese script primero
-- ============================================


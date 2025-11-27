/**
 * Calcula el precio foil estándar basado en el precio normal
 * 
 * Fórmula basada en rangos de precio del mercado:
 * - Precios muy bajos (< $10): 2.0x (cartas comunes, más accesibles)
 * - Precios bajos ($10 - $100): 1.8x (cartas poco comunes/raras)
 * - Precios medios ($100 - $500): 1.7x (super raras)
 * - Precios altos ($500 - $1000): 1.6x (legendarias)
 * - Precios muy altos (>= $1000): 1.7x (enchanted, premium)
 * 
 * Esta fórmula refleja que:
 * - Cartas baratas tienen mayor multiplicador (más accesibles, más demanda foil)
 * - Cartas caras tienen menor multiplicador (ya son premium, incremento relativo menor)
 * - Cartas muy caras vuelven a tener mayor multiplicador (coleccionables premium)
 */
export function calculateStandardFoilPrice(normalPrice: number): number {
  if (normalPrice <= 0) {
    return 0
  }
  
  // Precios muy bajos (< $10): 2.0x - Cartas comunes, más accesibles
  if (normalPrice < 10) {
    return Math.round(normalPrice * 2.0)
  }
  
  // Precios bajos ($10 - $100): 1.8x - Cartas poco comunes/raras
  if (normalPrice < 100) {
    return Math.round(normalPrice * 1.8)
  }
  
  // Precios medios ($100 - $500): 1.7x - Super raras
  if (normalPrice < 500) {
    return Math.round(normalPrice * 1.7)
  }
  
  // Precios altos ($500 - $1000): 1.6x - Legendarias
  if (normalPrice < 1000) {
    return Math.round(normalPrice * 1.6)
  }
  
  // Precios muy altos (>= $1000): 1.7x - Enchanted, premium
  return Math.round(normalPrice * 1.7)
}

/**
 * Asegura que el precio foil sea siempre mayor que el precio normal
 * usando el estándar de cálculo si es necesario
 */
export function ensureFoilPriceGreater(normalPrice: number, currentFoilPrice?: number | null): number {
  if (normalPrice <= 0) {
    return 0
  }
  
  // Si no hay precio foil actual, calcular usando el estándar
  if (!currentFoilPrice || currentFoilPrice <= normalPrice) {
    return calculateStandardFoilPrice(normalPrice)
  }
  
  // Si el precio foil actual es válido y mayor, mantenerlo
  return currentFoilPrice
}


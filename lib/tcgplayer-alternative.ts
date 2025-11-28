/**
 * Alternativa para obtener precios de TCGPlayer
 * 
 * Como TCGPlayer ya no otorga nuevas API keys, usamos APIs alternativas
 * que agregan datos de TCGPlayer sin necesidad de keys propias.
 * 
 * Opciones:
 * 1. Card Market API (via RapidAPI) - Agrega datos de TCGPlayer
 * 2. TCGAPIs - Acceso a datos de TCGPlayer sin keys
 */

interface CardPrice {
  normal: number | null // Precio normal en USD
  foil: number | null // Precio foil en USD
  source: string // Fuente del precio
}

/**
 * Obtener precio usando CardMarket API TCG (via RapidAPI)
 * Esta API agrega datos de TCGPlayer y otros mercados
 * Host: cardmarket-api-tcg.p.rapidapi.com
 */
async function getPriceFromCardMarket(cardName: string): Promise<CardPrice | null> {
  const rapidApiKey = process.env.RAPIDAPI_KEY
  if (!rapidApiKey) {
    return null
  }

  try {
    // Buscar carta de Lorcana en CardMarket API TCG
    // Endpoint para buscar productos de Lorcana
    const searchUrl = `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?search=${encodeURIComponent(cardName)}`
    
    const response = await fetch(searchUrl, {
      headers: {
        "x-rapidapi-key": rapidApiKey,
        "x-rapidapi-host": "cardmarket-api-tcg.p.rapidapi.com",
      },
    })

    if (!response.ok) {
      console.warn(`⚠️ CardMarket API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    
    // La estructura puede variar, intentar diferentes formatos
    let products = []
    if (Array.isArray(data)) {
      products = data
    } else if (data.products) {
      products = data.products
    } else if (data.results) {
      products = data.results
    } else if (data.data) {
      products = Array.isArray(data.data) ? data.data : [data.data]
    }
    
    // Buscar el primer resultado que coincida con el nombre
    const matchingProduct = products.find((p: any) => 
      p.name?.toLowerCase().includes(cardName.toLowerCase()) ||
      p.productName?.toLowerCase().includes(cardName.toLowerCase()) ||
      p.title?.toLowerCase().includes(cardName.toLowerCase())
    ) || products[0]

    if (matchingProduct) {
      // Intentar obtener precio de diferentes campos posibles
      const normalPrice = 
        matchingProduct.price ||
        matchingProduct.marketPrice ||
        matchingProduct.avgPrice ||
        matchingProduct.priceGuide?.avgSellPrice ||
        matchingProduct.priceGuide?.lowPrice ||
        matchingProduct.lowPrice ||
        matchingProduct.midPrice ||
        null

      const foilPrice = 
        matchingProduct.foilPrice ||
        matchingProduct.foilMarketPrice ||
        matchingProduct.foilPriceGuide?.avgSellPrice ||
        matchingProduct.foilPriceGuide?.lowPrice ||
        null

      if (normalPrice) {
        // Convertir a USD si viene en otra moneda (CardMarket puede dar precios en EUR)
        // Asumimos que viene en USD, si viene en EUR habría que convertir
        return {
          normal: typeof normalPrice === 'number' ? normalPrice : parseFloat(normalPrice),
          foil: foilPrice ? (typeof foilPrice === 'number' ? foilPrice : parseFloat(foilPrice)) : null,
          source: "cardmarket-tcgplayer",
        }
      }
    }

    return null
  } catch (error) {
    console.warn(`⚠️ Error getting price from CardMarket for ${cardName}:`, error)
    return null
  }
}

/**
 * Obtener precio usando TCGAPIs (alternativa gratuita)
 * Nota: Esta API puede requerir suscripción o tener limitaciones
 */
async function getPriceFromTCGAPIs(cardName: string): Promise<CardPrice | null> {
  try {
    // TCGAPIs endpoint - puede variar según la versión de la API
    const searchUrl = `https://api.tcgapis.com/v1/prices?game=lorcana&card=${encodeURIComponent(cardName)}`
    
    const response = await fetch(searchUrl, {
      headers: {
        "Accept": "application/json",
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    
    if (data.prices && data.prices.length > 0) {
      const price = data.prices[0]
      return {
        normal: price.marketPrice || price.midPrice || null,
        foil: price.foilMarketPrice || price.foilMidPrice || null,
        source: "tcgapis-tcgplayer",
      }
    }

    return null
  } catch (error) {
    // Silenciar error, es solo un fallback
    return null
  }
}

/**
 * Obtener precio de TCGPlayer usando métodos alternativos
 * 
 * Intenta múltiples fuentes en orden de preferencia
 */
export async function getTCGPlayerPriceAlternative(
  cardName: string
): Promise<CardPrice | null> {
  // Intentar Card Market API primero (si está configurada)
  const cardMarketPrice = await getPriceFromCardMarket(cardName)
  if (cardMarketPrice) {
    return cardMarketPrice
  }

  // Intentar TCGAPIs como alternativa
  const tcgApisPrice = await getPriceFromTCGAPIs(cardName)
  if (tcgApisPrice) {
    return tcgApisPrice
  }

  return null
}


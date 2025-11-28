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
    // Intentar diferentes endpoints posibles para Lorcana
    const endpoints = [
      `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?sort=episode_newest&search=${encodeURIComponent(cardName)}`,
      `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?search=${encodeURIComponent(cardName)}`,
      `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?sort=episode_newest`,
    ]
    
    let response: Response | null = null
    let lastError: Error | null = null
    
    // Intentar cada endpoint hasta que uno funcione
    for (const url of endpoints) {
      try {
        response = await fetch(url, {
          headers: {
            "x-rapidapi-key": rapidApiKey,
            "x-rapidapi-host": "cardmarket-api-tcg.p.rapidapi.com",
          },
        })
        
        if (response.ok) {
          break // Si funciona, usar este endpoint
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        continue
      }
    }
    
    if (!response) {
      console.warn(`⚠️ CardMarket API: No endpoints available for Lorcana`)
      return null
    }

    if (!response.ok) {
      console.warn(`⚠️ CardMarket API error: ${response.status} ${response.statusText}`)
      // Si el endpoint de Lorcana no existe, intentar sin el filtro de búsqueda
      if (response.status === 404) {
        // Intentar endpoint genérico de productos
        const genericUrl = `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?sort=episode_newest`
        const genericResponse = await fetch(genericUrl, {
          headers: {
            "x-rapidapi-key": rapidApiKey,
            "x-rapidapi-host": "cardmarket-api-tcg.p.rapidapi.com",
          },
        })
        
        if (genericResponse.ok) {
          const genericData = await genericResponse.json()
          // Buscar en los resultados
          return searchInProducts(genericData, cardName, rapidApiKey)
        }
      }
      return null
    }

    const data = await response.json()
    return searchInProducts(data, cardName, rapidApiKey)
  } catch (error) {
    console.warn(`⚠️ Error getting price from CardMarket for ${cardName}:`, error)
    return null
  }
}

/**
 * Buscar producto en los datos de CardMarket API
 */
async function searchInProducts(
  data: any,
  cardName: string,
  rapidApiKey: string
): Promise<CardPrice | null> {
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
  const matchingProduct = products.find((p: any) => {
    const name = (p.name || p.productName || p.title || "").toLowerCase()
    const searchName = cardName.toLowerCase()
    return name.includes(searchName) || searchName.includes(name.split(" - ")[0])
  }) || products[0]

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
      matchingProduct.tcgplayerPrice ||
      null

    const foilPrice = 
      matchingProduct.foilPrice ||
      matchingProduct.foilMarketPrice ||
      matchingProduct.foilPriceGuide?.avgSellPrice ||
      matchingProduct.foilPriceGuide?.lowPrice ||
      matchingProduct.foilFoilPrice ||
      null

    if (normalPrice) {
      // Los precios pueden venir en diferentes formatos
      // CardMarket puede dar precios en EUR, así que si es muy bajo, podría ser EUR
      // Por ahora asumimos USD, pero se puede ajustar
      const priceValue = typeof normalPrice === 'number' ? normalPrice : parseFloat(String(normalPrice))
      const foilValue = foilPrice ? (typeof foilPrice === 'number' ? foilPrice : parseFloat(String(foilPrice))) : null
      
      return {
        normal: priceValue,
        foil: foilValue,
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


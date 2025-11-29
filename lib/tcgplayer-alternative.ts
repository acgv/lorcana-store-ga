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

// Cache simple en memoria para evitar solicitudes duplicadas
const priceCache = new Map<string, { price: CardPrice | null; timestamp: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hora en milisegundos

// Rate limiting: controlar el tiempo entre solicitudes
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 500 // 500ms entre solicitudes (2 requests/segundo máximo)

// Función para esperar si es necesario (rate limiting)
async function waitForRateLimit(): Promise<void> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }
  
  lastRequestTime = Date.now()
}

// Función para hacer retry con exponential backoff
// NO hace retry para errores 4xx (excepto 429) ya que son errores del cliente
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Esperar antes de cada intento (excepto el primero)
      if (attempt > 0) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000) // Max 10 segundos
        console.log(`⏳ Retry ${attempt}/${maxRetries} para ${url} después de ${backoffDelay}ms`)
        await new Promise(resolve => setTimeout(resolve, backoffDelay))
      }
      
      // Timeout de 8 segundos por solicitud
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)
      
      try {
        const response = await fetch(url, { ...options, signal: controller.signal })
        clearTimeout(timeoutId)
        
        // Si es 404, 400, 401, 403 - NO hacer retry, son errores del cliente
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return response // Retornar la respuesta aunque sea error, para manejarlo arriba
        }
        
        // Si es 429, esperar más tiempo antes del siguiente retry
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000 * (attempt + 1)
          console.warn(`⚠️ Rate limit (429) - Esperando ${waitTime}ms antes del siguiente intento`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          lastError = new Error(`Rate limit: ${response.status} ${response.statusText}`)
          if (attempt < maxRetries - 1) {
            continue // Intentar de nuevo solo si no es el último intento
          }
        }
        
        return response
      } catch (fetchError) {
        clearTimeout(timeoutId)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timeout after 8 seconds')
        }
        throw fetchError
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      // Solo hacer retry para errores de red o 5xx, no para 4xx (excepto 429)
      if (attempt < maxRetries - 1) {
        continue // Intentar de nuevo
      }
    }
  }
  
  throw lastError || new Error('Failed to fetch after retries')
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

  // Verificar cache primero
  const cacheKey = `cardmarket-${cardName.toLowerCase()}`
  const cached = priceCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`💾 Cache hit para ${cardName}`)
    return cached.price
  }

  try {
    // Rate limiting: esperar antes de hacer la solicitud
    await waitForRateLimit()
    
    // Buscar carta de Lorcana en CardMarket API TCG
    // Intentar diferentes endpoints posibles para Lorcana
    const endpoints = [
      `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?sort=episode_newest&search=${encodeURIComponent(cardName)}`,
      `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?search=${encodeURIComponent(cardName)}`,
      `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?sort=episode_newest`,
    ]
    
    const headers = {
      "x-rapidapi-key": rapidApiKey,
      "x-rapidapi-host": "cardmarket-api-tcg.p.rapidapi.com",
    }
    
    let response: Response | null = null
    let lastError: Error | null = null
    
    // Intentar cada endpoint hasta que uno funcione (con retry)
    for (const url of endpoints) {
      try {
        response = await fetchWithRetry(url, { headers })
        
        if (response.ok) {
          break // Si funciona, usar este endpoint
        } else if (response.status === 429) {
          // Si es rate limit, esperar más tiempo antes de intentar el siguiente endpoint
          console.warn(`⚠️ Rate limit en endpoint ${url}, esperando antes de continuar...`)
          await new Promise(resolve => setTimeout(resolve, 10000)) // Esperar 10 segundos
          continue
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        continue
      }
    }
    
    if (!response) {
      console.warn(`⚠️ CardMarket API: No endpoints available for Lorcana`)
      // Guardar en cache como null para evitar intentos repetidos
      priceCache.set(cacheKey, { price: null, timestamp: Date.now() })
      return null
    }

    if (!response.ok) {
      if (response.status === 429) {
        console.error(`❌ CardMarket API: Rate limit (429) - Demasiadas solicitudes. Espera antes de continuar.`)
        // Guardar en cache temporalmente para evitar más solicitudes
        priceCache.set(cacheKey, { price: null, timestamp: Date.now() + 60000 }) // Cache por 1 minuto
        return null
      } else if (response.status === 404) {
        // 404 significa que el endpoint no existe o la carta no se encuentra
        // NO hacer retry, simplemente retornar null
        console.warn(`⚠️ CardMarket API: Carta no encontrada (404) - ${cardName}`)
        // Guardar en cache como null por más tiempo para evitar intentos repetidos
        priceCache.set(cacheKey, { price: null, timestamp: Date.now() + 3600000 }) // Cache por 1 hora
        return null
      } else {
        console.warn(`⚠️ CardMarket API error: ${response.status} ${response.statusText} para ${cardName}`)
        // Para otros errores 4xx, no hacer retry
        if (response.status >= 400 && response.status < 500) {
          priceCache.set(cacheKey, { price: null, timestamp: Date.now() + 300000 }) // Cache por 5 minutos
          return null
        }
      }
      
      // Para errores 5xx, podríamos intentar el endpoint genérico como fallback
      if (response.status >= 500) {
        console.warn(`⚠️ Error del servidor (${response.status}), intentando endpoint genérico...`)
        await waitForRateLimit()
        try {
          const genericUrl = `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?sort=episode_newest`
          const genericResponse = await fetchWithRetry(genericUrl, { headers })
          
          if (genericResponse.ok) {
            const genericData = await genericResponse.json()
            // Buscar en los resultados
            const result = await searchInProducts(genericData, cardName, rapidApiKey)
            // Guardar en cache
            priceCache.set(cacheKey, { price: result, timestamp: Date.now() })
            return result
          }
        } catch (err) {
          console.warn(`⚠️ Error en endpoint genérico:`, err)
        }
      }
      
      // Guardar en cache como null
      priceCache.set(cacheKey, { price: null, timestamp: Date.now() })
      return null
    }

    const data = await response.json()
    const result = await searchInProducts(data, cardName, rapidApiKey)
    
    // Guardar en cache
    priceCache.set(cacheKey, { price: result, timestamp: Date.now() })
    
    return result
  } catch (error) {
    console.warn(`⚠️ Error getting price from CardMarket for ${cardName}:`, error)
    // Guardar en cache como null para evitar intentos repetidos inmediatos
    priceCache.set(cacheKey, { price: null, timestamp: Date.now() + 60000 }) // Cache por 1 minuto
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


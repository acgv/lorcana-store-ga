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
const MIN_REQUEST_INTERVAL = 2000 // 2 segundos entre solicitudes para evitar rate limiting

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
 * Obtener precio usando Lorcast API (especializada en Lorcana)
 * Esta API proporciona precios de TCGPlayer para cartas de Lorcana
 * Host: api.lorcast.com
 */
async function getPriceFromLorcast(
  cardName: string,
  options?: {
    setId?: string // Set_ID de la API (ej: "TFC", "ROF")
    cardNumber?: number // Número de la carta (ej: 1, 2, 3)
    setName?: string // Nombre del set (ej: "The First Chapter")
  }
): Promise<CardPrice | null> {
  try {
    // Construir URL de búsqueda en Lorcast API
    // La API de Lorcast permite búsqueda por nombre, set y número
    let searchUrl = `https://api.lorcast.com/v1/cards/search?name=${encodeURIComponent(cardName)}`
    
    if (options?.setId) {
      searchUrl += `&set=${encodeURIComponent(options.setId)}`
    }
    
    if (options?.cardNumber) {
      searchUrl += `&number=${options.cardNumber}`
    }
    
    console.log(`🔍 Buscando en Lorcast API: ${searchUrl}`)
    
    const response = await fetch(searchUrl, {
      headers: {
        "Accept": "application/json",
      },
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`⚠️ Lorcast API: Carta no encontrada - ${cardName}`)
        return null
      }
      console.warn(`⚠️ Lorcast API error: ${response.status} ${response.statusText}`)
      return null
    }
    
    const data = await response.json()
    
    // La estructura de Lorcast puede variar, intentar diferentes formatos
    let card = null
    if (Array.isArray(data) && data.length > 0) {
      // Si hay múltiples resultados, buscar el más cercano
      card = data.find((c: any) => {
        const name = (c.name || c.Name || "").toLowerCase()
        const searchName = cardName.toLowerCase()
        return name === searchName || name.includes(searchName) || searchName.includes(name.split(" - ")[0])
      }) || data[0] // Si no encuentra exacto, usar el primero
    } else if (data.card || data.data) {
      card = data.card || data.data
    } else if (data.name || data.Name) {
      card = data
    }
    
    if (!card) {
      console.warn(`⚠️ Lorcast API: No se encontró carta en la respuesta`)
      return null
    }
    
    // Extraer precios - Lorcast proporciona precios en USD
    const normalPrice = card.prices?.tcgplayer?.normal || 
                       card.prices?.tcgplayer?.market ||
                       card.prices?.normal ||
                       card.tcgplayerPrice ||
                       card.price ||
                       null
    
    const foilPrice = card.prices?.tcgplayer?.foil ||
                     card.prices?.foil ||
                     card.tcgplayerFoilPrice ||
                     card.foilPrice ||
                     null
    
    if (normalPrice) {
      console.log(`✅ Precio encontrado en Lorcast: $${normalPrice} USD${foilPrice ? ` (foil: $${foilPrice} USD)` : ''}`)
      return {
        normal: typeof normalPrice === 'number' ? normalPrice : parseFloat(String(normalPrice)),
        foil: foilPrice ? (typeof foilPrice === 'number' ? foilPrice : parseFloat(String(foilPrice))) : null,
        source: 'lorcast-tcgplayer',
      }
    }
    
    return null
  } catch (error) {
    console.warn(`⚠️ Error obteniendo precio de Lorcast:`, error)
    return null
  }
}

/**
 * Obtener precio usando CardMarket API TCG (via RapidAPI)
 * Esta API agrega datos de TCGPlayer y otros mercados
 * Host: cardmarket-api-tcg.p.rapidapi.com
 * 
 * NOTA: Esta API NO tiene soporte para Lorcana actualmente
 * Se mantiene como fallback pero probablemente retornará null
 */
async function getPriceFromCardMarket(
  cardName: string,
  options?: {
    setId?: string // Set_ID de la API (ej: "TFC", "ROF")
    cardNumber?: number // Número de la carta (ej: 1, 2, 3)
    setName?: string // Nombre del set (ej: "The First Chapter")
  }
): Promise<CardPrice | null> {
  const rapidApiKey = process.env.RAPIDAPI_KEY
  if (!rapidApiKey) {
    return null
  }

  // Verificar cache primero - usar set y número si están disponibles para cache más preciso
  const cacheKey = options?.setId && options?.cardNumber
    ? `cardmarket-${options.setId.toLowerCase()}-${options.cardNumber}`
    : `cardmarket-${cardName.toLowerCase()}`
  const cached = priceCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`💾 Cache hit para ${cardName}${options?.setId && options?.cardNumber ? ` (${options.setId}-${options.cardNumber})` : ''}`)
    return cached.price
  }

  try {
    // Rate limiting: esperar antes de hacer la solicitud
    await waitForRateLimit()
    
    // Buscar carta de Lorcana en CardMarket API TCG
    // PRIORIDAD: Si tenemos set y número, buscar por esos parámetros (más exacto)
    // Si no, usar variaciones del nombre
    const endpoints: string[] = []
    
    if (options?.setId && options?.cardNumber) {
      // Búsqueda por set y número (MÁS EXACTO)
      const setId = options.setId // Mantener en mayúsculas (ej: "TFC")
      const setIdLower = setId.toLowerCase()
      const cardNum = options.cardNumber
      
      console.log(`🔍 Construyendo endpoints para búsqueda por set y número:`, {
        setId,
        setIdLower,
        cardNum,
        cardName,
      })
      
      // Intentar diferentes formatos de búsqueda por set y número
      endpoints.push(
        // Formato 1: set y number como parámetros separados (mayúsculas)
        `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?set=${setId}&number=${cardNum}`,
        // Formato 2: set y number en minúsculas
        `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?set=${setIdLower}&number=${cardNum}`,
        // Formato 3: cardNumber en lugar de number
        `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?set=${setId}&cardNumber=${cardNum}`,
        // Formato 4: buscar por número y filtrar por set
        `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?number=${cardNum}&set=${setId}`,
        // Formato 5: buscar combinando set y número en un string
        `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?search=${setId}-${cardNum}`,
        `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?search=${setIdLower}-${cardNum}`,
        `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?search=${setId} ${cardNum}`,
        // Formato 6: buscar solo por número (y filtrar en resultados)
        `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?number=${cardNum}`
      )
      
      console.log(`🔍 Buscando por Set y Número: ${setId}-${cardNum} (${cardName}) - ${endpoints.length} endpoints a probar`)
    }
    
    // Si no tenemos set/número o como fallback, usar variaciones del nombre
    const nameVariations = [
      cardName, // Nombre completo: "Ariel - On Human Legs"
      cardName.split(" - ")[0], // Solo nombre: "Ariel"
      cardName.replace(" - ", " "), // Sin guión: "Ariel On Human Legs"
    ]
    
    // Agregar endpoints con búsqueda por nombre (como fallback)
    for (const nameVar of nameVariations) {
      endpoints.push(
        `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?search=${encodeURIComponent(nameVar)}`,
        `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?sort=episode_newest&search=${encodeURIComponent(nameVar)}`
      )
    }
    
    // Agregar endpoint genérico al final (sin búsqueda) solo si no tenemos set/número
    if (!options?.setId || !options?.cardNumber) {
      endpoints.push(`https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?sort=episode_newest`)
    }
    
    const headers = {
      "x-rapidapi-key": rapidApiKey,
      "x-rapidapi-host": "cardmarket-api-tcg.p.rapidapi.com",
    }
    
    let response: Response | null = null
    let lastError: Error | null = null
    
    // Intentar cada endpoint hasta que uno funcione (con retry)
    // Pero solo intentar los primeros endpoints con búsqueda, si todos fallan con 404, no intentar el genérico
    let foundWorkingEndpoint = false
    let last404Endpoint: string | null = null
    
    for (const url of endpoints) {
      try {
        // Si el último endpoint fue 404 y este es genérico (sin search), saltarlo
        if (last404Endpoint && url.includes('sort=episode_newest') && !url.includes('search=')) {
          console.log(`⏭️ Saltando endpoint genérico ya que búsquedas específicas dieron 404`)
          break
        }
        
        response = await fetchWithRetry(url, { headers })
        
        if (response.ok) {
          foundWorkingEndpoint = true
          break // Si funciona, usar este endpoint
        } else if (response.status === 404) {
          // Si es 404, marcar y continuar con el siguiente
          last404Endpoint = url
          console.warn(`⚠️ Endpoint no encontrado (404): ${url}`)
          continue
        } else if (response.status === 429) {
          // Si es rate limit, esperar más tiempo antes de intentar el siguiente endpoint
          console.warn(`⚠️ Rate limit en endpoint ${url}, esperando antes de continuar...`)
          await new Promise(resolve => setTimeout(resolve, 10000)) // Esperar 10 segundos
          continue
        } else {
          // Otro error, continuar con el siguiente endpoint
          continue
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        // Si es timeout o error de red, continuar con el siguiente
        continue
      }
    }
    
    // Si no encontramos ningún endpoint que funcione, retornar null
    if (!foundWorkingEndpoint && !response) {
      console.warn(`⚠️ No se encontró ningún endpoint funcional para ${cardName}`)
      priceCache.set(cacheKey, { price: null, timestamp: Date.now() + 3600000 }) // Cache por 1 hora
      return null
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
        console.warn(`⚠️ Posible causa: El endpoint /lorcana/products puede no existir o no tener datos de Lorcana`)
        // Guardar en cache como null por más tiempo para evitar intentos repetidos
        priceCache.set(cacheKey, { price: null, timestamp: Date.now() + 3600000 }) // Cache por 1 hora
        return null
      } else {
        const errorText = await response.text().catch(() => 'No se pudo leer el error')
        console.warn(`⚠️ CardMarket API error: ${response.status} ${response.statusText} para ${cardName}`)
        console.warn(`⚠️ Detalle del error:`, errorText.substring(0, 300))
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

    let data: any
    try {
      data = await response.json()
    } catch (parseError) {
      console.error(`❌ Error parseando JSON de la respuesta:`, parseError)
      const text = await response.text().catch(() => 'No se pudo leer la respuesta')
      console.error(`❌ Respuesta recibida (primeros 500 chars):`, text.substring(0, 500))
      priceCache.set(cacheKey, { price: null, timestamp: Date.now() + 3600000 })
      return null
    }
    
    // Log de la estructura de datos recibida
    console.log(`📦 Estructura de datos recibida:`, {
      isArray: Array.isArray(data),
      hasProducts: !!data.products,
      hasResults: !!data.results,
      hasData: !!data.data,
      keys: typeof data === 'object' && data !== null ? Object.keys(data) : 'not an object',
      firstItem: Array.isArray(data) && data.length > 0 ? data[0] : (data?.products?.[0] || data?.results?.[0] || data?.data?.[0] || null),
      totalItems: Array.isArray(data) ? data.length : (data?.products?.length || data?.results?.length || data?.data?.length || 0),
    })
    
    // Si no hay datos, retornar null
    if (!data || (Array.isArray(data) && data.length === 0) && !data.products && !data.results && !data.data) {
      console.warn(`⚠️ Respuesta vacía o sin datos para ${cardName}`)
      priceCache.set(cacheKey, { price: null, timestamp: Date.now() + 3600000 })
      return null
    }
    
    // Pasar set y número a searchInProducts para búsqueda más precisa
    const result = await searchInProducts(data, cardName, rapidApiKey, options)
    
    console.log(`📊 Resultado de searchInProducts:`, result)
    
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
 * Ahora acepta set y número para búsqueda más precisa
 */
async function searchInProducts(
  data: any,
  cardName: string,
  rapidApiKey: string,
  options?: {
    setId?: string
    cardNumber?: number
    setName?: string
  }
): Promise<CardPrice | null> {
  // La estructura puede variar, intentar diferentes formatos
  // Según la documentación de la API, los productos vienen en data.data
  let products = []
  if (Array.isArray(data)) {
    products = data
  } else if (data.data && Array.isArray(data.data)) {
    // Estructura: { data: [...], paging: {...}, results: ... }
    products = data.data
  } else if (data.products) {
    products = data.products
  } else if (data.results) {
    products = data.results
  } else if (data.data && !Array.isArray(data.data)) {
    products = [data.data]
  }
  
  console.log(`🔍 Buscando en ${products.length} productos...`)
  
  // Buscar producto - PRIORIDAD: por set y número si están disponibles
  let matchingProduct: any = null
  
  if (options?.setId && options?.cardNumber) {
    console.log(`🔍 Buscando por set y número: ${options.setId}-${options.cardNumber}`)
    
    // Buscar por set y número (más exacto)
    matchingProduct = products.find((p: any) => {
      // Verificar número de carta
      const productNumber = p.number || p.cardNumber || p.cardNum || p.card_number || p.card_num
      const numberMatch = productNumber === options.cardNumber || 
                         productNumber === String(options.cardNumber) ||
                         Number(productNumber) === Number(options.cardNumber)
      
      // Verificar set (puede venir en diferentes formatos)
      const productSet = (p.set || p.setId || p.set_id || p.setName || p.set_name || "").toLowerCase()
      const setIdLower = options.setId.toLowerCase()
      const setNameLower = options.setName?.toLowerCase() || ""
      
      const setMatch = productSet === setIdLower || 
                      productSet.includes(setIdLower) ||
                      setIdLower.includes(productSet) ||
                      (setNameLower && productSet.includes(setNameLower.split(" ")[0]))
      
      if (numberMatch && setMatch) {
        console.log(`✅ Coincidencia encontrada:`, {
          productNumber,
          productSet,
          name: p.name || p.productName || p.title,
        })
      }
      
      return numberMatch && setMatch
    })
    
    // Si no encontramos por set/número, buscar por nombre como fallback
    if (!matchingProduct) {
      console.warn(`⚠️ No se encontró carta por set/número (${options.setId}-${options.cardNumber}), buscando por nombre...`)
      console.log(`📋 Primeros 3 productos para debug:`, products.slice(0, 3).map((p: any) => ({
        name: p.name || p.productName || p.title,
        number: p.number || p.cardNumber || p.cardNum,
        set: p.set || p.setId || p.setName,
      })))
      
      matchingProduct = products.find((p: any) => {
        const name = (p.name || p.productName || p.title || "").toLowerCase()
        const searchName = cardName.toLowerCase()
        return name.includes(searchName) || searchName.includes(name.split(" - ")[0])
      })
    } else {
      console.log(`✅ Carta encontrada por set/número: ${options.setId}-${options.cardNumber}`)
    }
  } else {
    // Buscar solo por nombre (fallback)
    console.log(`🔍 Buscando solo por nombre: ${cardName}`)
    matchingProduct = products.find((p: any) => {
      const name = (p.name || p.productName || p.title || "").toLowerCase()
      const searchName = cardName.toLowerCase()
      return name.includes(searchName) || searchName.includes(name.split(" - ")[0])
    })
  }
  
  // Si no encontramos nada, usar el primer resultado como último recurso
  if (!matchingProduct && products.length > 0) {
    console.warn(`⚠️ No se encontró coincidencia exacta, usando primer resultado como fallback`)
    matchingProduct = products[0]
  }
  
  if (!matchingProduct) {
    console.warn(`⚠️ No hay productos disponibles para buscar`)
    return null
  }
  
  console.log(`📦 Producto encontrado:`, {
    name: matchingProduct.name || matchingProduct.productName || matchingProduct.title,
    number: matchingProduct.number || matchingProduct.cardNumber || matchingProduct.cardNum,
    set: matchingProduct.set || matchingProduct.setId || matchingProduct.setName,
    availablePriceFields: Object.keys(matchingProduct).filter(k => k.toLowerCase().includes('price')),
  })

  if (matchingProduct) {
    // Según la estructura de la API que me mostraste:
    // prices.cardmarket.lowest (en EUR)
    // prices.tcgplayer.low o prices.tcgplayer.market (en USD)
    // episode.code (código del set, ej: "PFL", "MEG")
    
    // Priorizar TCGPlayer si está disponible (ya está en USD)
    const tcgplayerPrice = matchingProduct.prices?.tcgplayer?.low || 
                          matchingProduct.prices?.tcgplayer?.market ||
                          null
    const tcgplayerFoil = matchingProduct.prices?.tcgplayer?.foil?.low ||
                          matchingProduct.prices?.tcgplayer?.foil?.market ||
                          null
    
    // Si no hay TCGPlayer, usar CardMarket (en EUR, convertir a USD)
    const cardmarketPrice = matchingProduct.prices?.cardmarket?.lowest || null
    const cardmarketFoil = matchingProduct.prices?.cardmarket?.foil?.lowest || null
    
    let normalPriceUSD: number | null = null
    let foilPriceUSD: number | null = null
    
    if (tcgplayerPrice) {
      // TCGPlayer ya está en USD
      normalPriceUSD = typeof tcgplayerPrice === 'number' ? tcgplayerPrice : parseFloat(String(tcgplayerPrice))
      if (tcgplayerFoil) {
        foilPriceUSD = typeof tcgplayerFoil === 'number' ? tcgplayerFoil : parseFloat(String(tcgplayerFoil))
      }
    } else if (cardmarketPrice) {
      // CardMarket está en EUR, convertir a USD (aproximadamente 1 EUR = 1.1 USD)
      const eurToUsdRate = 1.1
      normalPriceUSD = (typeof cardmarketPrice === 'number' ? cardmarketPrice : parseFloat(String(cardmarketPrice))) * eurToUsdRate
      if (cardmarketFoil) {
        foilPriceUSD = (typeof cardmarketFoil === 'number' ? cardmarketFoil : parseFloat(String(cardmarketFoil))) * eurToUsdRate
      }
    } else {
      // Fallback: buscar en otros campos posibles
      const fallbackPrice = matchingProduct.price ||
                            matchingProduct.marketPrice ||
                            matchingProduct.avgPrice ||
                            matchingProduct.priceGuide?.avgSellPrice ||
                            matchingProduct.priceGuide?.lowPrice ||
                            matchingProduct.lowPrice ||
                            matchingProduct.midPrice ||
                            null
      
      if (fallbackPrice) {
        normalPriceUSD = typeof fallbackPrice === 'number' ? fallbackPrice : parseFloat(String(fallbackPrice))
      }
    }

    if (normalPriceUSD) {
      console.log(`💰 Precio extraído:`, {
        normal: normalPriceUSD,
        foil: foilPriceUSD,
        source: tcgplayerPrice ? 'tcgplayer' : (cardmarketPrice ? 'cardmarket' : 'fallback'),
        originalCurrency: tcgplayerPrice ? 'USD' : (cardmarketPrice ? 'EUR' : 'unknown'),
      })
      
      return {
        normal: normalPriceUSD,
        foil: foilPriceUSD,
        source: tcgplayerPrice ? 'tcgplayer' : (cardmarketPrice ? 'cardmarket' : 'fallback'),
      }
    } else {
      console.warn(`⚠️ No se encontró precio en el producto encontrado`)
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
 * Ahora acepta set y número para búsqueda más precisa
 */
export async function getTCGPlayerPriceAlternative(
  cardName: string,
  options?: {
    setId?: string // Set_ID de la API (ej: "TFC", "ROF")
    cardNumber?: number // Número de la carta (ej: 1, 2, 3)
    setName?: string // Nombre del set (ej: "The First Chapter")
  }
): Promise<CardPrice | null> {
  console.log(`🔍 getTCGPlayerPriceAlternative llamado para:`, {
    cardName,
    options,
  })

  // PRIORIDAD 1: Intentar Lorcast API (especializada en Lorcana)
  console.log(`🔄 Intentando Lorcast API (especializada en Lorcana)...`)
  const lorcastPrice = await getPriceFromLorcast(cardName, options)
  console.log(`📊 Resultado Lorcast:`, lorcastPrice)
  
  if (lorcastPrice && lorcastPrice.normal) {
    console.log(`✅ Precio encontrado en Lorcast: $${lorcastPrice.normal} USD`)
    return lorcastPrice
  }

  // PRIORIDAD 2: Intentar Card Market API (si está configurada)
  // NOTA: Esta API NO tiene soporte para Lorcana actualmente
  console.log(`🔄 Intentando CardMarket API...`)
  const cardMarketPrice = await getPriceFromCardMarket(cardName, options)
  console.log(`📊 Resultado CardMarket:`, cardMarketPrice)
  
  if (cardMarketPrice && cardMarketPrice.normal) {
    console.log(`✅ Precio encontrado en CardMarket: $${cardMarketPrice.normal} USD`)
    return cardMarketPrice
  }

  // PRIORIDAD 3: Intentar TCGAPIs como alternativa
  console.log(`🔄 Intentando TCGAPIs como alternativa...`)
  const tcgApisPrice = await getPriceFromTCGAPIs(cardName)
  console.log(`📊 Resultado TCGAPIs:`, tcgApisPrice)
  
  if (tcgApisPrice && tcgApisPrice.normal) {
    console.log(`✅ Precio encontrado en TCGAPIs: $${tcgApisPrice.normal} USD`)
    return tcgApisPrice
  }

  console.warn(`⚠️ No se encontró precio en ninguna fuente para ${cardName}`)
  console.warn(`⚠️ Nota: La API de CardMarket no tiene soporte para Lorcana. Considera usar Lorcast API.`)
  return null
}


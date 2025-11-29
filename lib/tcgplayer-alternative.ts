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
    // Intentar diferentes endpoints de Lorcast API
    // Según la documentación, puede variar el formato
    const endpoints = [
      // Formato 1: Búsqueda por nombre
      `https://api.lorcast.com/v1/cards/search?name=${encodeURIComponent(cardName)}`,
      // Formato 2: Búsqueda con set y número
      options?.setId && options?.cardNumber 
        ? `https://api.lorcast.com/v1/cards/${options.setId}/${options.cardNumber}`
        : null,
      // Formato 3: Búsqueda alternativa
      `https://lorcast.com/api/cards?name=${encodeURIComponent(cardName)}`,
    ].filter(Boolean) as string[]
    
    for (const searchUrl of endpoints) {
      try {
        // No loggear cada intento - solo si hay éxito o error inesperado
        const response = await fetch(searchUrl, {
          headers: {
            "Accept": "application/json",
          },
          // Timeout de 5 segundos
          signal: AbortSignal.timeout(5000),
        })
        
        if (!response.ok) {
          // 404 es esperado - Lorcast no tiene soporte para Lorcana, no loggear
          if (response.status === 404) {
            continue // Intentar siguiente endpoint
          }
          // Solo loggear errores inesperados (no 404)
          if (response.status !== 404) {
            console.warn(`⚠️ Lorcast API error (${response.status}): ${response.statusText}`)
          }
          continue
        }
        
        const data = await response.json()
        // Solo loggear si encontramos datos útiles
        
        // La estructura de Lorcast puede variar, intentar diferentes formatos
        let card = null
        if (Array.isArray(data) && data.length > 0) {
          // Si hay múltiples resultados, buscar el más cercano
          card = data.find((c: any) => {
            const name = (c.name || c.Name || c.title || "").toLowerCase()
            const searchName = cardName.toLowerCase()
            return name === searchName || name.includes(searchName) || searchName.includes(name.split(" - ")[0])
          }) || data[0] // Si no encuentra exacto, usar el primero
        } else if (data.card || data.data) {
          card = data.card || data.data
        } else if (data.name || data.Name) {
          card = data
        }
        
        if (!card) {
          continue // Intentar siguiente endpoint
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
      } catch (fetchError) {
        // No loggear errores de timeout o 404 - son esperados
        continue // Intentar siguiente endpoint
      }
    }
    
    // No loggear que Lorcast falló - es esperado que no tenga soporte para Lorcana
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
  if (cached) {
    const cacheAge = Date.now() - cached.timestamp
    // Si tiene precio válido y está en cache válido, usarlo
    if (cached.price && cached.price.normal && cacheAge < CACHE_TTL) {
      console.log(`💾 Cache hit para ${cardName}${options?.setId && options?.cardNumber ? ` (${options.setId}-${options.cardNumber})` : ''}`)
      return cached.price
    }
    // Si el cache tiene null, solo respetarlo si es muy reciente (menos de 5 minutos)
    // Esto evita spam pero permite reintentos después de un tiempo razonable
    if (!cached.price && cacheAge < 5 * 60 * 1000) { // 5 minutos
      console.log(`⏭️ Cache reciente con null para ${cardName}, saltando búsqueda (edad: ${Math.round(cacheAge / 1000)}s)`)
      return null
    }
    // Si el cache es antiguo o tiene null antiguo, intentar de nuevo
    if (cacheAge >= 5 * 60 * 1000) {
      console.log(`🔄 Cache antiguo para ${cardName} (${Math.round(cacheAge / 1000)}s), intentando búsqueda de nuevo`)
    }
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
          // 404 es esperado - CardMarket no tiene soporte para Lorcana, no loggear
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
      // Cache null solo por 5 minutos para permitir reintentos
      priceCache.set(cacheKey, { price: null, timestamp: Date.now() })
      return null
    }
    
    if (!response) {
      // CardMarket no tiene soporte para Lorcana - no loggear
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
        // 404 es esperado - CardMarket no tiene soporte para Lorcana, no loggear
        // Cache null solo por 5 minutos para permitir reintentos
        priceCache.set(cacheKey, { price: null, timestamp: Date.now() })
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
      // Cache null solo por 5 minutos para permitir reintentos
      priceCache.set(cacheKey, { price: null, timestamp: Date.now() })
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
      // Cache null solo por 5 minutos para permitir reintentos
      priceCache.set(cacheKey, { price: null, timestamp: Date.now() })
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
 * Obtener precio usando scraping robusto de múltiples fuentes
 * Intenta TCGPlayer, eBay, y otras fuentes para obtener precios reales
 * NOTA: Esto puede violar términos de servicio. Usar con precaución.
 */
async function getPriceFromTCGPlayerScraping(
  cardName: string,
  options?: {
    setId?: string
    cardNumber?: number
    setName?: string
  }
): Promise<CardPrice | null> {
  // Headers más realistas para evitar bloqueos
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Cache-Control": "max-age=0",
  }

  // MÉTODO 1: TCGPlayer - Buscar por nombre completo
  try {
    const searchQuery = encodeURIComponent(cardName)
    const tcgPlayerUrl = `https://www.tcgplayer.com/search/lorcana/product?q=${searchQuery}`
    
    console.log(`🔍 [Scraping] Intentando TCGPlayer: ${tcgPlayerUrl}`)
    
    const response = await fetch(tcgPlayerUrl, {
      headers,
      // Timeout de 15 segundos
      signal: AbortSignal.timeout(15000),
    })
    
    if (response.ok) {
      const html = await response.text()
      
      // Buscar datos JSON embebidos en el HTML (TCGPlayer usa esto)
      const jsonMatches = [
        html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/s),
        html.match(/window\.__PRELOADED_STATE__\s*=\s*({.+?});/s),
        html.match(/"products":\s*\[({.+?})\]/s),
        html.match(/__NEXT_DATA__["\s]*=[\s]*({.+?})<\/script>/s),
      ].filter(Boolean) as RegExpMatchArray[]
      
      for (const match of jsonMatches) {
        if (match && match[1]) {
          try {
            const jsonData = JSON.parse(match[1])
            // Buscar precios en la estructura JSON (diferentes posibles ubicaciones)
            const products = jsonData.products || 
                           jsonData.data?.products || 
                           jsonData.props?.pageProps?.products ||
                           jsonData.pageProps?.products ||
                           []
            
            for (const product of Array.isArray(products) ? products : [products]) {
              if (!product) continue
              
              const productName = (product.name || product.title || product.productName || "").toLowerCase()
              const searchName = cardName.toLowerCase()
              
              // Verificar si el nombre coincide
              if (productName.includes(searchName) || searchName.includes(productName.split(" - ")[0])) {
                const normalPrice = product.marketPrice || 
                                  product.lowPrice || 
                                  product.avgPrice || 
                                  product.price ||
                                  product.pricing?.market ||
                                  product.pricing?.low
                const foilPrice = product.foilMarketPrice || 
                                product.foilLowPrice || 
                                product.foilPrice ||
                                product.pricing?.foilMarket ||
                                product.pricing?.foilLow
                
                if (normalPrice) {
                  const price = typeof normalPrice === 'number' ? normalPrice : parseFloat(String(normalPrice))
                  const foil = foilPrice ? (typeof foilPrice === 'number' ? foilPrice : parseFloat(String(foilPrice))) : null
                  
                  if (price > 0 && price < 10000) { // Validación razonable
                    console.log(`✅ [Scraping] Precio encontrado en TCGPlayer (JSON embebido): $${price} USD${foil ? ` (foil: $${foil} USD)` : ''}`)
                    console.log(`📊 [Scraping] Detalles: producto="${productName}", precio=${normalPrice}, fuente=JSON embebido en HTML`)
                    return {
                      normal: price,
                      foil: foil,
                      source: 'tcgplayer-scraping-json',
                    }
                  }
                }
              }
            }
          } catch (parseError) {
            // Continuar con el siguiente método
            continue
          }
        }
      }
      
      // Método alternativo: buscar precios en atributos data-* o clases específicas
      const pricePatterns = [
        /data-market-price=["']([\d.]+)["']/i,
        /data-low-price=["']([\d.]+)["']/i,
        /data-price=["']([\d.]+)["']/i,
        /"marketPrice":\s*([\d.]+)/i,
        /"lowPrice":\s*([\d.]+)/i,
        /"avgPrice":\s*([\d.]+)/i,
        /class="[^"]*price[^"]*"[^>]*>[\s$]*([\d.]+)/i,
        /<span[^>]*class="[^"]*price[^"]*"[^>]*>[\s$]*([\d.]+)/i,
      ]
      
      for (const pattern of pricePatterns) {
        const match = html.match(pattern)
        if (match && match[1]) {
          const price = parseFloat(match[1])
          if (price > 0 && price < 10000) { // Validación razonable
            console.log(`✅ [Scraping] Precio encontrado en TCGPlayer (regex pattern: ${pattern}): $${price} USD`)
            console.log(`📊 [Scraping] Detalles: método=regex, patrón="${pattern}", precio=${price}`)
            return {
              normal: price,
              foil: null,
              source: 'tcgplayer-scraping-regex',
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️ [Scraping] Error en TCGPlayer:`, error instanceof Error ? error.message : error)
  }

  // MÉTODO 2: Buscar en la API interna de TCGPlayer (si está disponible)
  try {
    // TCGPlayer a veces expone una API interna
    const apiUrl = `https://www.tcgplayer.com/api/pricing/product?productName=${encodeURIComponent(cardName)}&gameName=lorcana`
    
    console.log(`🔍 [Scraping] Intentando API interna de TCGPlayer`)
    
    const apiResponse = await fetch(apiUrl, {
      headers: {
        ...headers,
        "Accept": "application/json",
        "Referer": "https://www.tcgplayer.com/",
      },
      signal: AbortSignal.timeout(10000),
    })
    
    if (apiResponse.ok) {
      const apiData = await apiResponse.json()
      
      if (apiData.marketPrice || apiData.lowPrice) {
        const normalPrice = apiData.marketPrice || apiData.lowPrice || apiData.avgPrice
        const foilPrice = apiData.foilMarketPrice || apiData.foilLowPrice
        
        if (normalPrice) {
          const price = typeof normalPrice === 'number' ? normalPrice : parseFloat(String(normalPrice))
          console.log(`✅ [Scraping] Precio encontrado en API interna de TCGPlayer: $${price} USD`)
          console.log(`📊 [Scraping] Detalles: método=API interna, URL=${apiUrl}, precio=${price}`)
          return {
            normal: price,
            foil: foilPrice ? (typeof foilPrice === 'number' ? foilPrice : parseFloat(String(foilPrice))) : null,
            source: 'tcgplayer-api-internal',
          }
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️ [Scraping] Error en API interna de TCGPlayer:`, error instanceof Error ? error.message : error)
  }

  // MÉTODO 3: Buscar en eBay como última opción
  try {
    const ebayQuery = encodeURIComponent(`Disney Lorcana ${cardName}`)
    const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${ebayQuery}&_sop=15` // Ordenar por precio más bajo
    
    console.log(`🔍 [Scraping] Intentando eBay como última opción`)
    
    const ebayResponse = await fetch(ebayUrl, {
      headers,
      signal: AbortSignal.timeout(15000),
    })
    
    if (ebayResponse.ok) {
      const html = await ebayResponse.text()
      
      // eBay muestra precios en formato específico - buscar en el HTML
      const priceMatches = html.match(/\$([\d,]+\.?\d*)/g) || []
      const prices = priceMatches
        .map(match => parseFloat(match.replace(/[$,]/g, '')))
        .filter(price => price > 0 && price < 10000 && price > 0.5) // Filtrar precios razonables
        .sort((a, b) => a - b) // Ordenar de menor a mayor
      
      if (prices.length > 0) {
        // Usar el promedio de los primeros 5 precios más bajos como referencia
        const topPrices = prices.slice(0, Math.min(5, prices.length))
        const avgPrice = topPrices.reduce((sum, p) => sum + p, 0) / topPrices.length
        console.log(`✅ [Scraping] Precio estimado de eBay: $${avgPrice.toFixed(2)} USD (basado en ${topPrices.length} resultados)`)
        console.log(`📊 [Scraping] Detalles: método=eBay, precios encontrados=[${topPrices.join(', ')}], promedio=${avgPrice.toFixed(2)}`)
        return {
          normal: avgPrice,
          foil: null, // eBay no distingue fácilmente entre normal y foil
          source: 'ebay-scraping',
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️ [Scraping] Error en eBay:`, error instanceof Error ? error.message : error)
  }

  console.warn(`⚠️ [Scraping] No se encontró precio en ninguna fuente de scraping`)
  return null
}

/**
 * Obtener precio desde DexHunter API (incluye precios de mercado)
 * https://api.dexhunter.io/v1/lorcana/prices
 */
async function getPriceFromDexHunter(
  cardName: string,
  options?: {
    setId?: string
    cardNumber?: number
    setName?: string
  }
): Promise<CardPrice | null> {
  try {
    await waitForRateLimit()
    
    // DexHunter API - obtener todos los precios y buscar la carta
    const pricesUrl = "https://api.dexhunter.io/v1/lorcana/prices"
    
    console.log(`🔍 Intentando DexHunter API para ${cardName}`)
    
    const response = await fetch(pricesUrl, {
      headers: {
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(10000), // 10 segundos timeout
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        // No loggear 404 - es esperado si no hay datos
        return null
      }
      console.warn(`⚠️ DexHunter API error (${response.status}): ${response.statusText}`)
      return null
    }
    
    const data = await response.json()
    
    // La estructura puede variar, intentar diferentes formatos
    const prices = data.prices || data.data || data.cards || (Array.isArray(data) ? data : [])
    
    if (!Array.isArray(prices) || prices.length === 0) {
      return null
    }
    
    // Buscar la carta por nombre (y opcionalmente por set/número)
    const searchName = cardName.toLowerCase()
    let matchedCard = null
    
    for (const card of prices) {
      const cardNameLower = (card.name || card.cardName || card.title || "").toLowerCase()
      
      // Buscar coincidencia exacta o parcial
      if (cardNameLower === searchName || 
          cardNameLower.includes(searchName) || 
          searchName.includes(cardNameLower.split(" - ")[0])) {
        
        // Si tenemos setId y cardNumber, intentar match más preciso
        if (options?.setId && options?.cardNumber) {
          const cardSetId = (card.setId || card.set_id || card.set || "").toLowerCase()
          const cardNum = card.number || card.cardNumber || card.card_number
          
          if (cardSetId === options.setId.toLowerCase() && cardNum === options.cardNumber) {
            matchedCard = card
            break
          }
        } else {
          matchedCard = card
          // Continuar buscando por si hay una mejor coincidencia
        }
      }
    }
    
    if (!matchedCard) {
      return null
    }
    
    // Extraer precios - DexHunter puede tener diferentes estructuras
    const normalPrice = matchedCard.price || 
                      matchedCard.marketPrice || 
                      matchedCard.tcgplayerPrice ||
                      matchedCard.prices?.normal ||
                      matchedCard.prices?.market ||
                      null
    
    const foilPrice = matchedCard.foilPrice || 
                     matchedCard.foilMarketPrice ||
                     matchedCard.prices?.foil ||
                     matchedCard.prices?.foilMarket ||
                     null
    
    if (normalPrice) {
      const price = typeof normalPrice === 'number' ? normalPrice : parseFloat(String(normalPrice))
      const foil = foilPrice ? (typeof foilPrice === 'number' ? foilPrice : parseFloat(String(foilPrice))) : null
      
      if (price > 0 && price < 10000) { // Validación razonable
        console.log(`✅ Precio encontrado en DexHunter: $${price} USD${foil ? ` (foil: $${foil} USD)` : ''}`)
        return {
          normal: price,
          foil: foil,
          source: 'dexhunter',
        }
      }
    }
    
    return null
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Timeout - no loggear
      return null
    }
    // No loggear errores de DexHunter - son esperados si no está disponible
    return null
  }
}

/**
 * Obtener precio desde Lorcana API (solo datos de carta, no precios de mercado)
 * https://api.lorcana-api.com/cards
 * NOTA: Esta API NO proporciona precios de mercado, solo datos de cartas
 */
async function getCardDataFromLorcanaAPI(
  cardName: string,
  options?: {
    setId?: string
    cardNumber?: number
  }
): Promise<CardPrice | null> {
  try {
    await waitForRateLimit()
    
    // La API de Lorcana no tiene precios de mercado, solo datos de cartas
    // Pero podemos usarla para validar que la carta existe
    let searchUrl = "https://api.lorcana-api.com/cards"
    
    if (options?.setId && options?.cardNumber) {
      // Buscar por set y número
      searchUrl = `https://api.lorcana-api.com/cards/fetch?set=${options.setId}&number=${options.cardNumber}`
    } else {
      // Buscar por nombre
      searchUrl = `https://api.lorcana-api.com/cards/fetch?search=${encodeURIComponent(cardName)}`
    }
    
    const response = await fetch(searchUrl, {
      headers: {
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(8000),
    })
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    const cards = Array.isArray(data) ? data : (data.cards || data.data || [])
    
    if (cards.length === 0) {
      return null
    }
    
    // La API de Lorcana NO tiene precios de mercado
    // Solo retornamos null para indicar que la carta existe pero no hay precio
    return null
  } catch (error) {
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
    bypassCache?: boolean // Si es true, ignorar el cache y buscar de nuevo
  }
): Promise<CardPrice | null> {
  console.log(`🔍 getTCGPlayerPriceAlternative llamado para:`, {
    cardName,
    options,
  })

  // Construir clave de cache usando setId y cardNumber para más precisión
  const cacheKey = options?.setId && options?.cardNumber
    ? `${cardName.toLowerCase()}-${options.setId}-${options.cardNumber}`
    : cardName.toLowerCase()

  // Verificar cache solo si no se está haciendo bypass
  if (!options?.bypassCache) {
    const cached = priceCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      // Solo usar cache si tiene un precio válido (no null)
      if (cached.price && cached.price.normal) {
        console.log(`💾 Cache hit para ${cardName}${options?.setId && options?.cardNumber ? ` (${options.setId}-${options.cardNumber})` : ''}`)
        return cached.price
      }
      // Si el cache tiene null, pero es muy reciente (menos de 5 minutos), no intentar de nuevo
      // Esto evita spam de solicitudes cuando sabemos que no hay precio
      const cacheAge = Date.now() - cached.timestamp
      if (cacheAge < 5 * 60 * 1000) { // 5 minutos
        console.log(`⏭️ Cache reciente con null para ${cardName}, saltando búsqueda (edad: ${Math.round(cacheAge / 1000)}s)`)
        return null
      }
      // Si el cache es antiguo (más de 5 minutos), intentar de nuevo
      console.log(`🔄 Cache antiguo para ${cardName}, intentando búsqueda de nuevo`)
    }
  } else {
    console.log(`🔄 Bypass de cache solicitado para ${cardName}`)
  }

  // PRIORIDAD 1: Intentar DexHunter API (tiene precios de mercado reales)
  // https://api.dexhunter.io/v1/lorcana/prices
  const dexHunterPrice = await getPriceFromDexHunter(cardName, options)
  
  if (dexHunterPrice && dexHunterPrice.normal) {
    console.log(`✅ Precio encontrado en DexHunter: $${dexHunterPrice.normal} USD`)
    priceCache.set(cacheKey, { price: dexHunterPrice, timestamp: Date.now() })
    return dexHunterPrice
  }

  // PRIORIDAD 2: Intentar Lorcast API (especializada en Lorcana)
  // NOTA: Lorcast actualmente no tiene soporte para Lorcana, pero lo intentamos por si acaso
  const lorcastPrice = await getPriceFromLorcast(cardName, options)
  
  if (lorcastPrice && lorcastPrice.normal) {
    console.log(`✅ Precio encontrado en Lorcast: $${lorcastPrice.normal} USD`)
    priceCache.set(cacheKey, { price: lorcastPrice, timestamp: Date.now() })
    return lorcastPrice
  }

  // PRIORIDAD 3: Intentar Card Market API (si está configurada)
  // NOTA: Esta API NO tiene soporte para Lorcana actualmente
  const cardMarketPrice = await getPriceFromCardMarket(cardName, options)
  
  if (cardMarketPrice && cardMarketPrice.normal) {
    console.log(`✅ Precio encontrado en CardMarket: $${cardMarketPrice.normal} USD`)
    priceCache.set(cacheKey, { price: cardMarketPrice, timestamp: Date.now() })
    return cardMarketPrice
  }

  // PRIORIDAD 4: Intentar TCGAPIs como alternativa
  const tcgApisPrice = await getPriceFromTCGAPIs(cardName)
  
  if (tcgApisPrice && tcgApisPrice.normal) {
    console.log(`✅ Precio encontrado en TCGAPIs: $${tcgApisPrice.normal} USD`)
    priceCache.set(cacheKey, { price: tcgApisPrice, timestamp: Date.now() })
    return tcgApisPrice
  }

  // PRIORIDAD 4: Intentar scraping de TCGPlayer (última opción)
  // NOTA: Esto puede violar términos de servicio de TCGPlayer
  try {
    const scrapingPrice = await getPriceFromTCGPlayerScraping(cardName, options)
    
    if (scrapingPrice && scrapingPrice.normal) {
      console.log(`✅ Precio encontrado en TCGPlayer (scraping): $${scrapingPrice.normal} USD`)
      return scrapingPrice
    }
  } catch (error) {
    // No loggear errores de scraping - son esperados si está bloqueado
  }

  // PRIORIDAD 5: Intentar scraping de eBay (última opción)
  try {
    const ebayPrice = await getPriceFromEbayScraping(cardName, options)
    
    if (ebayPrice && ebayPrice.normal) {
      console.log(`✅ Precio encontrado en eBay (scraping): $${ebayPrice.normal} USD`)
      return ebayPrice
    }
  } catch (error) {
    // No loggear errores de scraping - son esperados si está bloqueado
  }

  // Solo mostrar un resumen al final si no se encontró precio
  console.warn(`⚠️ No se encontró precio de mercado para ${cardName} en ninguna fuente disponible`)
  
  // Guardar null en cache solo por 5 minutos (no 1 hora) para permitir reintentos
  // Si después de 5 minutos sigue sin encontrarse, probablemente no hay precio disponible
  priceCache.set(cacheKey, { price: null, timestamp: Date.now() })
  
  return null
}


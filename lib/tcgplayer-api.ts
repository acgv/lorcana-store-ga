/**
 * TCGPlayer API Integration
 * 
 * Obtiene precios reales de mercado de cartas Lorcana desde TCGPlayer
 * Documentación: https://docs.tcgplayer.com/
 * 
 * Requiere variables de entorno:
 * - TCGPLAYER_PUBLIC_KEY
 * - TCGPLAYER_PRIVATE_KEY
 */

interface TCGPlayerPrice {
  low: number
  mid: number
  high: number
  market: number
  directLow: number | null
}

interface TCGPlayerProduct {
  productId: number
  name: string
  cleanName: string
  imageUrl: string
  categoryId: number
  groupId: number
  url: string
  modifiedOn: string
  imageCount: number
  presaleInfo: any
  extendedData: any[]
}

interface TCGPlayerPricing {
  productId: number
  lowPrice: number
  midPrice: number
  highPrice: number
  marketPrice: number
  directLowPrice: number | null
  subTypeName: string
}

// Cache para evitar múltiples llamadas
const priceCache = new Map<string, { price: { normal: TCGPlayerPrice | null; foil: TCGPlayerPrice | null }; timestamp: number }>()
const CACHE_DURATION = 60 * 60 * 1000 // 1 hora

/**
 * Obtener token de acceso de TCGPlayer
 */
async function getAccessToken(): Promise<string | null> {
  const publicKey = process.env.TCGPLAYER_PUBLIC_KEY
  const privateKey = process.env.TCGPLAYER_PRIVATE_KEY

  if (!publicKey || !privateKey) {
    console.warn("⚠️ TCGPlayer API keys not configured")
    return null
  }

  try {
    const response = await fetch("https://api.tcgplayer.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: publicKey,
        client_secret: privateKey,
      }),
    })

    if (!response.ok) {
      console.error("❌ TCGPlayer token error:", response.status)
      return null
    }

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error("❌ Error getting TCGPlayer token:", error)
    return null
  }
}

/**
 * Buscar producto en TCGPlayer por nombre
 */
async function searchProduct(
  cardName: string,
  accessToken: string
): Promise<TCGPlayerProduct | null> {
  try {
    // Buscar en la categoría de Lorcana (categoría 67 según TCGPlayer)
    const searchUrl = `https://api.tcgplayer.com/catalog/products?categoryId=67&productName=${encodeURIComponent(cardName)}&limit=1`
    
    const response = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      console.warn(`⚠️ TCGPlayer search failed for ${cardName}:`, response.status)
      return null
    }

    const data = await response.json()
    if (data.results && data.results.length > 0) {
      return data.results[0]
    }

    return null
  } catch (error) {
    console.error(`❌ Error searching TCGPlayer for ${cardName}:`, error)
    return null
  }
}

/**
 * Obtener precios de un producto de TCGPlayer
 */
async function getProductPricing(
  productId: number,
  accessToken: string
): Promise<TCGPlayerPricing[] | null> {
  try {
    const pricingUrl = `https://api.tcgplayer.com/pricing/product/${productId}`
    
    const response = await fetch(pricingUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      console.warn(`⚠️ TCGPlayer pricing failed for product ${productId}:`, response.status)
      return null
    }

    const data = await response.json()
    if (data.results && data.results.length > 0) {
      return data.results
    }

    return null
  } catch (error) {
    console.error(`❌ Error getting TCGPlayer pricing for product ${productId}:`, error)
    return null
  }
}

/**
 * Obtener precio de una carta desde TCGPlayer
 * 
 * @param cardName - Nombre de la carta
 * @returns Precio en USD o null si no se encuentra
 */
export async function getTCGPlayerPrice(
  cardName: string
): Promise<{ normal: TCGPlayerPrice | null; foil: TCGPlayerPrice | null } | null> {
  // Verificar cache
  const cacheKey = cardName.toLowerCase()
  const cached = priceCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.price
  }

  const accessToken = await getAccessToken()
  if (!accessToken) {
    return null
  }

  try {
    // Buscar producto
    const product = await searchProduct(cardName, accessToken)
    if (!product) {
      return null
    }

    // Obtener precios
    const pricing = await getProductPricing(product.productId, accessToken)
    if (!pricing || pricing.length === 0) {
      return null
    }

    // Buscar precio normal (no foil)
    const normalPricing = pricing.find((p: TCGPlayerPricing) => 
      !p.subTypeName || 
      (!p.subTypeName.toLowerCase().includes('foil') && 
       !p.subTypeName.toLowerCase().includes('holo'))
    ) || pricing[0]

    // Buscar precio foil
    const foilPricing = pricing.find((p: TCGPlayerPricing) => 
      p.subTypeName && 
      (p.subTypeName.toLowerCase().includes('foil') || 
       p.subTypeName.toLowerCase().includes('holo'))
    )

    const normalPrice: TCGPlayerPrice = {
      low: normalPricing.lowPrice || 0,
      mid: normalPricing.midPrice || 0,
      high: normalPricing.highPrice || 0,
      market: normalPricing.marketPrice || normalPricing.midPrice || 0,
      directLow: normalPricing.directLowPrice,
    }

    let foilPrice: TCGPlayerPrice | null = null
    if (foilPricing) {
      foilPrice = {
        low: foilPricing.lowPrice || 0,
        mid: foilPricing.midPrice || 0,
        high: foilPricing.highPrice || 0,
        market: foilPricing.marketPrice || foilPricing.midPrice || 0,
        directLow: foilPricing.directLowPrice,
      }
    }

    const result = {
      normal: normalPrice,
      foil: foilPrice,
    }

    // Guardar en cache
    priceCache.set(cacheKey, { price: result, timestamp: Date.now() })

    return result
  } catch (error) {
    console.error(`❌ Error getting TCGPlayer price for ${cardName}:`, error)
    return null
  }
}

/**
 * Convertir precio de USD a CLP
 * 
 * @param usdPrice - Precio en USD
 * @param exchangeRate - Tasa de cambio (default: 1000 CLP por USD)
 * @returns Precio en CLP
 */
export function convertUSDToCLP(usdPrice: number, exchangeRate: number = 1000): number {
  return Math.round(usdPrice * exchangeRate)
}

/**
 * Obtener precio de mercado de una carta (en CLP)
 * 
 * @param cardName - Nombre de la carta
 * @returns Precio normal y foil en CLP, o null si no se encuentra
 */
export async function getMarketPrice(cardName: string): Promise<{
  normal: number | null
  foil: number | null
  source: "tcgplayer" | "standard"
} | null> {
  const tcgPrice = await getTCGPlayerPrice(cardName)

  if (tcgPrice && tcgPrice.normal) {
    return {
      normal: convertUSDToCLP(tcgPrice.normal.market || tcgPrice.normal.mid),
      foil: tcgPrice.foil ? convertUSDToCLP(tcgPrice.foil.market || tcgPrice.foil.mid) : null,
      source: "tcgplayer",
    }
  }

  return null
}


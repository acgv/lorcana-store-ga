import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"
import { calculateFinalPrice, getCalculationParams, calculatePriceDifference } from "@/lib/price-calculator"

// Verificar que el usuario es admin
async function verifyAdmin(request: NextRequest): Promise<{ success: boolean; error?: string; status?: number }> {
  try {
    // Obtener token de sesión del header Authorization
    const authHeader = request.headers.get("Authorization")
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // Si no hay token, verificar si hay cookie de sesión
      const cookies = request.cookies
      const sessionToken = cookies.get("sb-access-token")?.value || 
                          cookies.get("supabase-auth-token")?.value
      
      if (!sessionToken) {
        return { success: false, error: "No authentication token", status: 401 }
      }

      // Verificar token de cookie
      if (!supabaseAdmin) {
        return { success: false, error: "Auth service not configured", status: 503 }
      }

      const { data, error } = await supabaseAdmin.auth.getUser(sessionToken)
      if (error || !data.user) {
        return { success: false, error: "Invalid token", status: 401 }
      }

      // Verificar rol admin
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .single()

      if (!roleData || roleData.role !== "admin") {
        return { success: false, error: "Admin role required", status: 403 }
      }

      return { success: true }
    }

    const token = authHeader.replace("Bearer ", "")
    
    if (!supabaseAdmin) {
      return { success: false, error: "Auth service not configured", status: 503 }
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data.user) {
      return { success: false, error: "Invalid token", status: 401 }
    }

    // Verificar rol admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .single()

    if (!roleData || roleData.role !== "admin") {
      return { success: false, error: "Admin role required", status: 403 }
    }

    return { success: true }
  } catch (error) {
    console.error("Error verifying admin:", error)
    return { success: false, error: "Internal error", status: 500 }
  }
}

interface LorcanaAPICard {
  Name: string
  Set_Name: string
  Set_ID: string
  Card_Num: number
  Rarity: string
  Type: string
  Image: string
  Cost?: number // Costo de ink (no precio de mercado)
}

interface DatabaseCard {
  id: string
  name: string
  set: string
  number: number
  rarity: string
  type: string
  price: number
  foilPrice: number
  normalStock: number
  foilStock: number
  image: string
}

interface ComparisonResult {
  cardId: string
  cardName: string
  set: string
  number: number
  rarity: string
  type: string
  
  // Stock actual
  currentNormalStock: number
  currentFoilStock: number
  
  // Precios actuales
  currentPrice: number
  currentFoilPrice: number
  
  // Precios de mercado (de TCGPlayer o estándar) - en USD
  marketPriceUSD: number | null
  marketFoilPriceUSD: number | null
  priceSource: "tcgplayer" | "standard" // Fuente del precio
  
  // Precios sugeridos (calculados con la fórmula)
  suggestedPriceCLP: number | null
  suggestedFoilPriceCLP: number | null
  
  // Diferencias con precio sugerido
  priceDifference: number
  foilPriceDifference: number
  priceDifferencePercent: number
  foilPriceDifferencePercent: number
  
  // Estado
  hasStock: boolean
  needsPriceUpdate: boolean
  image: string
}

// Precios estándar por rareza en USD (basados en valores típicos de mercado)
// Estos se usarán para calcular el precio sugerido con la fórmula del Excel
function getStandardPriceUSD(rarity: string): number {
  const standardPricesUSD: Record<string, number> = {
    common: 0.50,       // $0.50 USD
    uncommon: 1.00,     // $1.00 USD
    rare: 2.50,         // $2.50 USD
    superRare: 5.00,    // $5.00 USD
    legendary: 30.00,   // $30.00 USD
    enchanted: 50.00,   // $50.00 USD
  }
  
  return standardPricesUSD[rarity] || 0.50
}

// Mapeo de sets (igual que en el script)
const setMap: Record<string, string> = {
  'The First Chapter': 'firstChapter',
  'Rise of the Floodborn': 'riseOfFloodborn',
  'Into the Inklands': 'intoInklands',
  "Ursula's Return": 'ursulaReturn',
  'Shimmering Skies': 'shimmering',
  'Azurite Sea': 'azurite',
  "Archazia's Island": 'archazia',
  'Reign of Jafar': 'reignOfJafar',
  'Fabled': 'fabled',
  'Whispers in the Well': 'whi',
  'Chapter 1': 'firstChapter',
  'Chapter 2': 'riseOfFloodborn',
  'Chapter 3': 'intoInklands',
  'Chapter 4': 'ursulaReturn',
  'Chapter 5': 'shimmering',
  'Chapter 6': 'azurite',
  'Chapter 7': 'archazia',
  'Chapter 8': 'reignOfJafar',
  'Chapter 9': 'fabled',
  'Set 1': 'firstChapter',
  'Set 2': 'riseOfFloodborn',
  'Set 3': 'intoInklands',
  'Set 4': 'ursulaReturn',
  'Set 5': 'shimmering',
  'Set 6': 'azurite',
  'Set 7': 'archazia',
  'Set 8': 'reignOfJafar',
  'Set 9': 'fabled',
}

const rarityMap: Record<string, string> = {
  'Common': 'common',
  'Uncommon': 'uncommon',
  'Rare': 'rare',
  'Super Rare': 'superRare',
  'Legendary': 'legendary',
  'Enchanted': 'enchanted',
}

// Generar ID de carta igual que en el script de importación
function generateCardId(setName: string, cardNum: number): string {
  const mappedSet = setMap[setName] || setName.toLowerCase().replace(/\s+/g, '')
  return `${mappedSet}-${cardNum}`.toLowerCase()
}

export async function GET(request: NextRequest) {
  try {
    // Verificar que el usuario es admin
    const auth = await verifyAdmin(request)
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Obtener parámetros de paginación
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1", 10)
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10) // Procesar 50 cartas por vez
    const skip = (page - 1) * pageSize

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Supabase not configured" },
        { status: 500 }
      )
    }

    console.log("🔄 Fetching comparison data...")

    // 1. Obtener todas las cartas de la base de datos (sin límite)
    // Supabase por defecto limita a 1000, necesitamos obtener todas
    let dbCards: any[] = []
    let from = 0
    const dbPageSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const { data, error: dbError } = await supabaseAdmin
        .from("cards")
        .select("id, name, set, number, rarity, type, price, foilPrice, normalStock, foilStock, image")
        .eq("status", "approved")
        .range(from, from + dbPageSize - 1)
      
      if (dbError) {
        console.error("Error fetching database cards:", dbError)
        throw dbError
      }
      
      if (data && data.length > 0) {
        dbCards = dbCards.concat(data)
        from += dbPageSize
        hasMore = data.length === dbPageSize
      } else {
        hasMore = false
      }
    }

    console.log(`✅ Found ${dbCards.length} cards in database`)

    // 2. Obtener todas las cartas de la API de Lorcana
    let lorcanaCards: LorcanaAPICard[] = []
    try {
      const apiResponse = await fetch("https://api.lorcana-api.com/cards/all", {
        next: { revalidate: 3600 }, // Cache por 1 hora
      })

      if (!apiResponse.ok) {
        throw new Error(`API error: ${apiResponse.status}`)
      }

      lorcanaCards = await apiResponse.json()
      console.log(`✅ Found ${lorcanaCards.length} cards from Lorcana API`)
    } catch (apiError) {
      console.error("Error fetching Lorcana API:", apiError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch data from Lorcana API",
          details: apiError instanceof Error ? apiError.message : "Unknown error",
        },
        { status: 500 }
      )
    }

    // 3. Crear mapa de cartas de la BD por ID
    const dbCardsMap = new Map<string, DatabaseCard>()
    dbCards.forEach((card) => {
      dbCardsMap.set(card.id, card as DatabaseCard)
    })

    // 4. Comparar cartas
    const comparisons: ComparisonResult[] = []
    const cardsOnlyInAPI: Array<{ name: string; set: string; number: number; rarity: string }> = []
    const cardsOnlyInDB: Array<{ id: string; name: string; set: string }> = []

    // Comparar cartas de la API con la BD
    console.log("🔄 Starting price comparison...")
    
    // Filtrar promocionales primero
    const nonPromoCards = lorcanaCards.filter(
      (card) =>
        !card.Image?.includes("/promo") &&
        !card.Image?.includes("/promo2/") &&
        !card.Image?.includes("/promo3/")
    )
    
    const totalCards = nonPromoCards.length
    const totalPages = Math.ceil(totalCards / pageSize)
    
    // Procesar solo el lote actual (paginación)
    const startIndex = skip
    const endIndex = Math.min(skip + pageSize, totalCards)
    const cardsToProcess = nonPromoCards.slice(startIndex, endIndex)
    
    console.log(`🔄 Processing page ${page}/${totalPages} (cards ${startIndex + 1}-${endIndex} of ${totalCards})...`)

    let processed = 0
    for (const apiCard of cardsToProcess) {
      const cardId = generateCardId(apiCard.Set_Name, apiCard.Card_Num)
      const dbCard = dbCardsMap.get(cardId)

      const rarity = rarityMap[apiCard.Rarity] || "common"
      
      // Obtener precio real de la API (CardMarket/RapidAPI)
      let marketPriceUSD: number | null = null
      let marketFoilPriceUSD: number | null = null
      let priceSource: "tcgplayer" | "standard" = "standard"
      
      // Intentar obtener precio de CardMarket API (RapidAPI)
      if (process.env.RAPIDAPI_KEY) {
        try {
          const { getTCGPlayerPriceAlternative } = await import("@/lib/tcgplayer-alternative")
          const altPrice = await getTCGPlayerPriceAlternative(apiCard.Name)
          
          if (altPrice && altPrice.normal) {
            marketPriceUSD = altPrice.normal
            marketFoilPriceUSD = altPrice.foil
            priceSource = "tcgplayer"
          }
        } catch (error) {
          // Si falla, usar precio estándar
          console.warn(`⚠️ Error getting price for ${apiCard.Name}:`, error)
        }
      }
      
      // Si no se obtuvo precio de la API, usar precio estándar por rareza
      if (!marketPriceUSD) {
        marketPriceUSD = getStandardPriceUSD(rarity)
        marketFoilPriceUSD = marketPriceUSD * 1.6
      }

      if (dbCard) {
        // Calcular precio sugerido usando la fórmula del Excel
        const calcParams = getCalculationParams()
        let suggestedPriceCLP: number | null = null
        let suggestedFoilPriceCLP: number | null = null

        if (marketPriceUSD) {
          // Calcular precio sugerido basado en precio de TCGPlayer
          const calculation = calculateFinalPrice({
            ...calcParams,
            basePriceUSD: marketPriceUSD,
          })
          suggestedPriceCLP = calculation.finalPriceCLP

          // Si hay precio foil, calcular también
          if (marketFoilPriceUSD) {
            const foilCalculation = calculateFinalPrice({
              ...calcParams,
              basePriceUSD: marketFoilPriceUSD,
            })
            suggestedFoilPriceCLP = foilCalculation.finalPriceCLP
          }
        }

        // Comparar precio actual con precio sugerido
        const priceComparison = suggestedPriceCLP
          ? calculatePriceDifference(dbCard.price || 0, suggestedPriceCLP)
          : { difference: 0, differencePercent: 0, needsUpdate: false }

        const foilComparison = suggestedFoilPriceCLP
          ? calculatePriceDifference(dbCard.foilPrice || 0, suggestedFoilPriceCLP)
          : { difference: 0, differencePercent: 0, needsUpdate: false }

        comparisons.push({
          cardId: dbCard.id,
          cardName: dbCard.name,
          set: dbCard.set,
          number: dbCard.number,
          rarity: dbCard.rarity,
          type: dbCard.type,
          currentNormalStock: dbCard.normalStock || 0,
          currentFoilStock: dbCard.foilStock || 0,
          currentPrice: dbCard.price || 0,
          currentFoilPrice: dbCard.foilPrice || 0,
          marketPriceUSD,
          marketFoilPriceUSD,
          priceSource,
          suggestedPriceCLP,
          suggestedFoilPriceCLP,
          priceDifference: priceComparison.difference,
          foilPriceDifference: foilComparison.difference,
          priceDifferencePercent: priceComparison.differencePercent,
          foilPriceDifferencePercent: foilComparison.differencePercent,
          hasStock: (dbCard.normalStock || 0) > 0 || (dbCard.foilStock || 0) > 0,
          needsPriceUpdate: priceComparison.needsUpdate || foilComparison.needsUpdate,
          image: dbCard.image || apiCard.Image,
        })
      } else {
        // Carta solo en API (no está en nuestra BD)
        cardsOnlyInAPI.push({
          name: apiCard.Name,
          set: apiCard.Set_Name,
          number: apiCard.Card_Num,
          rarity: rarity,
        })
      }

      processed++
      if (processed % 100 === 0) {
        console.log(`⏳ Processed ${processed}/${cardsToProcess.length} cards...`)
      }
    }

    console.log(`✅ Price comparison completed. Processed ${processed} cards in this batch.`)

    // Calcular cartas solo en BD (solo en la última página para eficiencia)
    if (page === totalPages) {
      const allApiCardIds = new Set(
        nonPromoCards.map((apiCard) => generateCardId(apiCard.Set_Name, apiCard.Card_Num))
      )
      
      dbCards.forEach((card) => {
        if (!allApiCardIds.has(card.id)) {
          cardsOnlyInDB.push({
            id: card.id,
            name: card.name,
            set: card.set,
          })
        }
      })
    }

    // Estadísticas parciales (solo del lote actual)
    const batchStats = {
      totalInDatabase: dbCards.length,
      totalInAPI: lorcanaCards.length,
      totalCompared: comparisons.length,
      withStock: comparisons.filter((c) => c.hasStock).length,
      withoutStock: comparisons.filter((c) => !c.hasStock).length,
      needsPriceUpdate: comparisons.filter((c) => c.needsPriceUpdate).length,
      onlyInAPI: cardsOnlyInAPI.length,
      onlyInDB: cardsOnlyInDB.length,
      averagePriceDifference: comparisons.length > 0
        ? Math.round(
            (comparisons.reduce((sum, c) => sum + c.priceDifferencePercent, 0) /
              comparisons.length) *
              100
          ) / 100
        : 0,
    }

    return NextResponse.json({
      success: true,
      data: {
        comparisons,
        cardsOnlyInAPI,
        cardsOnlyInDB,
        stats: batchStats,
        pagination: {
          page,
          pageSize,
          totalPages,
          totalCards,
          totalInDatabase: dbCards.length,
          totalInAPI: lorcanaCards.length,
          hasMore: page < totalPages,
        },
      },
    })
  } catch (error) {
    console.error("Error in compare-prices:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}


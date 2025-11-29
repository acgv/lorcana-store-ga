import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"
import { calculateFinalPrice, getCalculationParams, calculatePriceDifference } from "@/lib/price-calculator"
import { verifyAdmin } from "@/lib/auth"

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
// El script usa Set_ID (ej: "TFC") no el nombre del set
function generateCardId(setName: string, cardNum: number, setId?: string): string {
  // Si tenemos Set_ID, usarlo directamente (como en el script de importación)
  if (setId) {
    return `${setId}-${cardNum}`.toLowerCase()
  }
  // Fallback: mapear nombre del set a Set_ID conocido
  const setIdMap: Record<string, string> = {
    'The First Chapter': 'tfc',
    'Rise of the Floodborn': 'rof',
    'Into the Inklands': 'iti',
    "Ursula's Return": 'ur',
    'Shimmering Skies': 'ss',
    'Azurite Sea': 'as',
    "Archazia's Island": 'ai',
    'Reign of Jafar': 'roj',
    'Fabled': 'f',
    'Whispers in the Well': 'wiw',
  }
  const mappedSetId = setIdMap[setName] || setName.toLowerCase().replace(/\s+/g, '')
  return `${mappedSetId}-${cardNum}`.toLowerCase()
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

    // Obtener parámetros de paginación y filtros
    const { searchParams } = new URL(request.url)
    const pageParam = searchParams.get("page")
    const pageSizeParam = searchParams.get("pageSize")
    // Siempre intentar obtener precios reales de TCGPlayer (a menos que se deshabilite explícitamente)
    const fetchExternalPrices = searchParams.get("fetchExternalPrices") !== "false"
    const filterSet = searchParams.get("set") // Filtro por set (igual que en catálogo)
    
    // Parámetros de cálculo de precios (opcionales, si no se pasan usa defaults)
    const customParams = {
      usTaxRate: searchParams.get("usTaxRate") ? parseFloat(searchParams.get("usTaxRate")!) : undefined,
      shippingUSD: searchParams.get("shippingUSD") ? parseFloat(searchParams.get("shippingUSD")!) : undefined,
      chileVATRate: searchParams.get("chileVATRate") ? parseFloat(searchParams.get("chileVATRate")!) : undefined,
      exchangeRate: searchParams.get("exchangeRate") ? parseFloat(searchParams.get("exchangeRate")!) : undefined,
      profitMargin: searchParams.get("profitMargin") ? parseFloat(searchParams.get("profitMargin")!) : undefined,
      mercadoPagoFee: searchParams.get("mercadoPagoFee") ? parseFloat(searchParams.get("mercadoPagoFee")!) : undefined,
    }
    
    console.log(`🔍 API recibió parámetros:`, { 
      filterSet, 
      pageParam, 
      pageSizeParam, 
      customParams,
      rawParams: {
        usTaxRate: searchParams.get("usTaxRate"),
        shippingUSD: searchParams.get("shippingUSD"),
        chileVATRate: searchParams.get("chileVATRate"),
        exchangeRate: searchParams.get("exchangeRate"),
        profitMargin: searchParams.get("profitMargin"),
        mercadoPagoFee: searchParams.get("mercadoPagoFee"),
      }
    })
    
    // Si no se pasan parámetros, procesar todas las cartas (igual que catálogo)
    const usePagination = pageParam !== null || pageSizeParam !== null
    const page = pageParam ? parseInt(pageParam, 10) : 1
    const pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : (usePagination ? 50 : 999999) // Si no hay paginación, procesar todas
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
      let query = supabaseAdmin
        .from("cards")
        .select("id, name, set, number, rarity, type, price, foilPrice, normalStock, foilStock, image")
        .eq("status", "approved")
        .range(from, from + dbPageSize - 1)
      
      // Filtrar por set si se especifica (igual que en catálogo)
      if (filterSet && filterSet !== "all") {
        query = query.eq("set", filterSet)
        console.log(`🔍 Filtrando BD por set: ${filterSet}`)
      }
      
      const { data, error: dbError } = await query
      
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

    console.log(`✅ Found ${dbCards.length} cards in database${filterSet && filterSet !== "all" ? ` (filtrado por set: ${filterSet})` : ""}`)
    
    // Log de sets únicos en la BD para debugging
    if (dbCards.length > 0) {
      const uniqueSetsInDB = [...new Set(dbCards.map(c => c.set))].sort()
      console.log(`📊 Sets únicos en BD:`, uniqueSetsInDB.slice(0, 10))
    }

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
    let nonPromoCards = lorcanaCards.filter(
      (card) =>
        !card.Image?.includes("/promo") &&
        !card.Image?.includes("/promo2/") &&
        !card.Image?.includes("/promo3/")
    )
    
      // Filtrar por set si se especifica (mapear el valor del filtro al nombre del set en la API)
      if (filterSet && filterSet !== "all") {
        // Buscar el nombre del set en la API que corresponde al valor del filtro
        const setNamesInAPI = Object.keys(setMap).filter(key => setMap[key] === filterSet)
        console.log(`🔍 Buscando mapeo para set: ${filterSet}`, { setNamesInAPI, setMapKeys: Object.keys(setMap) })
        
        if (setNamesInAPI.length > 0) {
          const setNameInAPI = setNamesInAPI[0]
          const beforeFilter = nonPromoCards.length
          nonPromoCards = nonPromoCards.filter(card => card.Set_Name === setNameInAPI)
          console.log(`✅ Filtrando por set: ${filterSet} (${setNameInAPI}) - ${beforeFilter} → ${nonPromoCards.length} cartas`)
        } else {
          console.warn(`⚠️ No se encontró mapeo para el set: ${filterSet}`)
        }
      } else {
        console.log(`ℹ️ No se aplicó filtro de set (filterSet: ${filterSet})`)
      }
    
    const totalCards = nonPromoCards.length
    const totalPages = usePagination ? Math.ceil(totalCards / pageSize) : 1
    
    // Procesar todas las cartas si no hay paginación, o solo el lote actual si hay paginación
    const startIndex = usePagination ? skip : 0
    const endIndex = usePagination ? Math.min(skip + pageSize, totalCards) : totalCards
    const cardsToProcess = nonPromoCards.slice(startIndex, endIndex)
    
    if (usePagination) {
      console.log(`🔄 Processing page ${page}/${totalPages} (cards ${startIndex + 1}-${endIndex} of ${totalCards})...`)
    } else {
      console.log(`🔄 Processing all ${totalCards} cards (no pagination)...`)
    }

    let processed = 0
    // Procesar UNA carta a la vez con delay entre cada una para evitar rate limiting
    const DELAY_BETWEEN_CARDS = 3000 // 3 segundos entre cada carta
    
    for (const apiCard of cardsToProcess) {
      // Usar Set_ID para generar el ID (igual que en el script de importación)
      const cardId = generateCardId(apiCard.Set_Name, apiCard.Card_Num, apiCard.Set_ID)
      const dbCard = dbCardsMap.get(cardId)

      const rarity = rarityMap[apiCard.Rarity] || "common"
      
      // Obtener precio REAL de TCGPlayer (CardMarket/RapidAPI) - SIEMPRE
      // NO usar precios estándar, solo precios reales de TCGPlayer
      let marketPriceUSD: number | null = null
      let marketFoilPriceUSD: number | null = null
      let priceSource: "tcgplayer" | "standard" = "standard"
      
      // Verificar que RAPIDAPI_KEY esté configurada
      if (!process.env.RAPIDAPI_KEY) {
        console.error(`❌ RAPIDAPI_KEY no configurada - No se pueden obtener precios de TCGPlayer`)
        // No establecer marketPriceUSD, quedará como null
        } else if (fetchExternalPrices) {
        try {
          // Timeout más corto (6 segundos) para evitar que se quede pegado
          // Pasar set y número para búsqueda más precisa
          const pricePromise = (async () => {
            const { getTCGPlayerPriceAlternative } = await import("@/lib/tcgplayer-alternative")
            return await getTCGPlayerPriceAlternative(apiCard.Name, {
              setId: apiCard.Set_ID, // ej: "TFC", "ROF"
              cardNumber: apiCard.Card_Num, // ej: 1, 2, 3
              setName: apiCard.Set_Name, // ej: "The First Chapter"
            })
          })()
          
          const timeoutPromise = new Promise<null>((resolve) => 
            setTimeout(() => resolve(null), 6000)
          )
          
          const altPrice = await Promise.race([pricePromise, timeoutPromise])
          
          if (altPrice && altPrice.normal) {
            marketPriceUSD = altPrice.normal
            marketFoilPriceUSD = altPrice.foil || null
            priceSource = "tcgplayer"
            if (processed < 5 || processed % 20 === 0) {
              console.log(`✅ Precio TCGPlayer obtenido para ${apiCard.Name}: $${marketPriceUSD} USD${marketFoilPriceUSD ? ` (foil: $${marketFoilPriceUSD} USD)` : ''}`)
            }
          } else {
            // No loguear cada fallo para evitar saturación, solo algunos
            if (processed < 3) {
              console.warn(`⚠️ No se pudo obtener precio TCGPlayer para ${apiCard.Name} - Precio quedará como null`)
            }
            // NO establecer precio estándar, quedará como null
          }
        } catch (error) {
          // Si falla, NO usar precio estándar, dejar como null
          // Solo loguear errores críticos, no todos
          if (processed < 3) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            // No loguear timeouts normales
            if (!errorMsg.includes('timeout') && !errorMsg.includes('404')) {
              console.error(`❌ Error getting TCGPlayer price for ${apiCard.Name}:`, errorMsg)
            }
          }
          // marketPriceUSD queda como null - continuar con la siguiente carta
        }
      } else {
        console.warn(`⚠️ fetchExternalPrices está deshabilitado para ${apiCard.Name} - Precio quedará como null`)
      }
      
      // NO usar precio estándar como fallback - solo precios reales de TCGPlayer
      // Si marketPriceUSD es null, se mostrará como "-" en el frontend

      if (dbCard) {
        // Calcular precio sugerido usando la fórmula del Excel
        // Usar parámetros personalizados si se proporcionaron, sino usar defaults
        const defaultParams = getCalculationParams()
        const calcParams = {
          ...defaultParams,
          ...(customParams.usTaxRate !== undefined && { usTaxRate: customParams.usTaxRate }),
          ...(customParams.shippingUSD !== undefined && { shippingUSD: customParams.shippingUSD }),
          ...(customParams.chileVATRate !== undefined && { chileVATRate: customParams.chileVATRate }),
          ...(customParams.exchangeRate !== undefined && { exchangeRate: customParams.exchangeRate }),
          ...(customParams.profitMargin !== undefined && { profitMargin: customParams.profitMargin }),
          ...(customParams.mercadoPagoFee !== undefined && { mercadoPagoFee: customParams.mercadoPagoFee }),
        }
        
        // Log solo para las primeras 3 cartas para no saturar
        if (processed < 3) {
          console.log(`💰 Cálculo de precio para ${apiCard.Name}:`, {
            marketPriceUSD,
            defaultParams,
            customParams,
            finalCalcParams: calcParams,
          })
        }
        
        let suggestedPriceCLP: number | null = null
        let suggestedFoilPriceCLP: number | null = null

        // Solo calcular precio sugerido si tenemos precio REAL de TCGPlayer
        // NO calcular si marketPriceUSD es null (no hay precio de TCGPlayer disponible)
        if (marketPriceUSD && priceSource === "tcgplayer") {
          // Calcular precio sugerido basado en precio REAL de TCGPlayer
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
        } else {
          // Si no hay precio de TCGPlayer, no calcular precio sugerido
          console.warn(`⚠️ No se puede calcular precio sugerido para ${dbCard.name} - No hay precio de TCGPlayer disponible`)
        }

        // Comparar precio actual con precio sugerido
        const priceComparison = suggestedPriceCLP
          ? calculatePriceDifference(dbCard.price || 0, suggestedPriceCLP)
          : { difference: 0, differencePercent: 0, needsUpdate: false }

        const foilComparison = suggestedFoilPriceCLP
          ? calculatePriceDifference(dbCard.foilPrice || 0, suggestedFoilPriceCLP)
          : { difference: 0, differencePercent: 0, needsUpdate: false }

        // Log para debugging: verificar que marketPriceUSD no sea una conversión del precio de BD
        if (processed < 3) {
          console.log(`🔍 Debug precio para ${dbCard.name}:`, {
            precioBD_CLP: dbCard.price,
            marketPriceUSD,
            priceSource,
            esConversionBD: marketPriceUSD && dbCard.price ? Math.abs((dbCard.price / 1000) - marketPriceUSD) < 0.01 : false,
          })
        }

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
      if (processed % 10 === 0) {
        console.log(`⏳ Processed ${processed}/${cardsToProcess.length} cards...`)
      }
      
      // Delay entre cartas para evitar rate limiting (excepto en la última carta)
      if (processed < cardsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CARDS))
      }
    }

    console.log(`✅ Price comparison completed. Processed ${processed} cards in this batch.`)

    // Calcular cartas solo en BD (solo en la última página si hay paginación, o siempre si no hay paginación)
    if (!usePagination || page === totalPages) {
      const allApiCardIds = new Set(
        nonPromoCards.map((apiCard) => generateCardId(apiCard.Set_Name, apiCard.Card_Num, apiCard.Set_ID))
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

    console.log(`✅ API respondiendo con:`, {
      comparisons: comparisons.length,
      cardsOnlyInAPI: cardsOnlyInAPI.length,
      cardsOnlyInDB: cardsOnlyInDB.length,
      stats: batchStats,
    })

    return NextResponse.json({
      success: true,
      data: {
        comparisons,
        cardsOnlyInAPI,
        cardsOnlyInDB,
        stats: batchStats,
        // Solo incluir paginación si se está usando
        ...(usePagination && {
          pagination: {
            page,
            pageSize,
            totalPages,
            totalCards,
            totalInDatabase: dbCards.length,
            totalInAPI: lorcanaCards.length,
            hasMore: page < totalPages,
          },
        }),
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


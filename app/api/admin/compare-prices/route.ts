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

const rarityMap: Record<string, string> = {
  'Common': 'common',
  'Uncommon': 'uncommon',
  'Rare': 'rare',
  'Super Rare': 'superRare',
  'Legendary': 'legendary',
  'Enchanted': 'enchanted',
}

function generateCardId(setId: string, cardNum: number): string {
  return `${setId}-${cardNum}`.toLowerCase()
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
    // NO buscar precios de TCGPlayer por defecto - se buscarán individualmente con botones
    const fetchExternalPrices = false // Siempre false - búsqueda individual
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
        .select("id, name, set, number, rarity, type, price, foilPrice, normalStock, foilStock, image, marketPriceUSD, marketFoilPriceUSD")
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
    
      if (filterSet && filterSet !== "all") {
        const beforeFilter = nonPromoCards.length
        nonPromoCards = nonPromoCards.filter(card => card.Set_ID.toLowerCase() === filterSet)
        console.log(`✅ Filtrando por set: ${filterSet} - ${beforeFilter} → ${nonPromoCards.length} cartas`)
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
    
    // Procesar todas las cartas (sin buscar precios de TCGPlayer automáticamente)
    for (const apiCard of cardsToProcess) {
      const cardId = generateCardId(apiCard.Set_ID, apiCard.Card_Num)
      const dbCard = dbCardsMap.get(cardId)

      const rarity = rarityMap[apiCard.Rarity] || "common"
      
      // Leer precios USD guardados en la base de datos (si existen)
      // Estos son los valores que el admin ingresó manualmente
      let marketPriceUSD: number | null = dbCard?.marketPriceUSD ?? null
      let marketFoilPriceUSD: number | null = dbCard?.marketFoilPriceUSD ?? null
      let priceSource: "tcgplayer" | "standard" | "manual" = marketPriceUSD ? "manual" : "standard"
      
      // Los precios USD se ingresan manualmente desde el frontend
      // Los precios sugeridos en CLP se calculan en tiempo real, no se guardan

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

        // Calcular precio sugerido si tenemos precio USD (guardado en BD o ingresado manualmente)
        // Los precios sugeridos se calculan en tiempo real, no se guardan en BD
        if (marketPriceUSD) {
          const calculation = calculateFinalPrice({
            ...calcParams,
            basePriceUSD: marketPriceUSD,
          })
          suggestedPriceCLP = calculation.finalPriceCLP
        }

        // Si hay precio foil USD, calcular también
        if (marketFoilPriceUSD) {
          const foilCalculation = calculateFinalPrice({
            ...calcParams,
            basePriceUSD: marketFoilPriceUSD,
          })
          suggestedFoilPriceCLP = foilCalculation.finalPriceCLP
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
      if (processed % 50 === 0) {
        console.log(`⏳ Processed ${processed}/${cardsToProcess.length} cards...`)
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


import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"

interface LorcanaAPICard {
  Name: string
  Set_Name: string
  Set_ID: string
  Card_Num: number
  Rarity: string
  Type: string
  Image: string
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
  
  // Precios estándar de la API (basados en rareza)
  standardPrice: number
  standardFoilPrice: number
  
  // Diferencias
  priceDifference: number
  foilPriceDifference: number
  priceDifferencePercent: number
  foilPriceDifferencePercent: number
  
  // Estado
  hasStock: boolean
  needsPriceUpdate: boolean
  image: string
}

// Precios estándar por rareza (igual que en el script de importación)
function getStandardPrice(rarity: string): number {
  const standardPrices: Record<string, number> = {
    common: 500,        // $5.00
    uncommon: 1000,     // $10.00
    rare: 2500,         // $25.00
    superRare: 5000,    // $50.00
    legendary: 30000,   // $300.00
    enchanted: 50000,   // $500.00
  }
  
  return standardPrices[rarity] || 500
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
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Supabase not configured" },
        { status: 500 }
      )
    }

    console.log("🔄 Fetching comparison data...")

    // 1. Obtener todas las cartas de la base de datos
    const { data: dbCards, error: dbError } = await supabaseAdmin
      .from("cards")
      .select("id, name, set, number, rarity, type, price, foilPrice, normalStock, foilStock, image")
      .eq("status", "approved")

    if (dbError) {
      console.error("Error fetching database cards:", dbError)
      throw dbError
    }

    console.log(`✅ Found ${dbCards?.length || 0} cards in database`)

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
    dbCards?.forEach((card) => {
      dbCardsMap.set(card.id, card as DatabaseCard)
    })

    // 4. Comparar cartas
    const comparisons: ComparisonResult[] = []
    const cardsOnlyInAPI: Array<{ name: string; set: string; number: number; rarity: string }> = []
    const cardsOnlyInDB: Array<{ id: string; name: string; set: string }> = []

    // Comparar cartas de la API con la BD
    for (const apiCard of lorcanaCards) {
      // Filtrar promocionales
      if (
        apiCard.Image?.includes("/promo") ||
        apiCard.Image?.includes("/promo2/") ||
        apiCard.Image?.includes("/promo3/")
      ) {
        continue
      }

      const cardId = generateCardId(apiCard.Set_Name, apiCard.Card_Num)
      const dbCard = dbCardsMap.get(cardId)

      const rarity = rarityMap[apiCard.Rarity] || "common"
      const standardPrice = getStandardPrice(rarity)
      const standardFoilPrice = Math.round(standardPrice * 1.6) // Foil es 1.6x el precio normal

      if (dbCard) {
        // Carta existe en ambas - comparar
        const priceDiff = dbCard.price - standardPrice
        const foilPriceDiff = dbCard.foilPrice - standardFoilPrice
        const priceDiffPercent = standardPrice > 0 ? (priceDiff / standardPrice) * 100 : 0
        const foilPriceDiffPercent = standardFoilPrice > 0 ? (foilPriceDiff / standardFoilPrice) * 100 : 0

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
          standardPrice,
          standardFoilPrice,
          priceDifference: priceDiff,
          foilPriceDifference: foilPriceDiff,
          priceDifferencePercent: Math.round(priceDiffPercent * 100) / 100,
          foilPriceDifferencePercent: Math.round(foilPriceDiffPercent * 100) / 100,
          hasStock: (dbCard.normalStock || 0) > 0 || (dbCard.foilStock || 0) > 0,
          needsPriceUpdate: Math.abs(priceDiffPercent) > 5 || Math.abs(foilPriceDiffPercent) > 5, // Más de 5% de diferencia
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
    }

    // Cartas solo en BD (no están en la API)
    dbCards?.forEach((card) => {
      const found = lorcanaCards.some(
        (apiCard) => generateCardId(apiCard.Set_Name, apiCard.Card_Num) === card.id
      )
      if (!found) {
        cardsOnlyInDB.push({
          id: card.id,
          name: card.name,
          set: card.set,
        })
      }
    })

    // Estadísticas
    const stats = {
      totalInDatabase: dbCards?.length || 0,
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
        stats,
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


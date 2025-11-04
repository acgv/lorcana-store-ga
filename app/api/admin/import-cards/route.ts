import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"

// Mapeo de sets - TODOS los sets de Lorcana (1-9)
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

// Mapeo de rareza
const rarityMap: Record<string, string> = {
  'Common': 'common',
  'Uncommon': 'uncommon',
  'Rare': 'rare',
  'Super Rare': 'superRare',
  'Legendary': 'legendary',
  'Enchanted': 'enchanted',
}

// Mapeo de tipos
const typeMap: Record<string, string> = {
  'Character': 'character',
  'Action': 'action',
  'Item': 'item',
  'Location': 'location',
  'Song': 'song',
}

interface LorcanaCard {
  Name: string
  Title?: string
  Set_ID: string
  Card_Num: number
  Set_Total?: number
  Set_Name: string
  Rarity: string
  Type: string
  Image?: string
  Body_Text?: string
  Flavor_Text?: string
}

function transformCard(lorcanaCard: LorcanaCard) {
  const rarity = rarityMap[lorcanaCard.Rarity] || 'common'
  
  // Mapear set - si no existe, usar Set_ID como fallback
  let mappedSet = setMap[lorcanaCard.Set_Name]
  if (!mappedSet) {
    mappedSet = lorcanaCard.Set_ID ? lorcanaCard.Set_ID.toLowerCase() : 'unknown'
  }

  return {
    id: `${lorcanaCard.Set_ID}-${lorcanaCard.Card_Num}`.toLowerCase(),
    name: lorcanaCard.Name + (lorcanaCard.Title ? ` - ${lorcanaCard.Title}` : ''),
    image: lorcanaCard.Image || '/placeholder.svg',
    set: mappedSet,
    rarity: rarity,
    type: typeMap[lorcanaCard.Type] || 'character',
    number: lorcanaCard.Card_Num,
    cardNumber: `${lorcanaCard.Card_Num}/${lorcanaCard.Set_Total || 204}`,
    // ⭐ SIN PRECIO NI STOCK (admin los configura manualmente)
    price: 0,
    foilPrice: 0,
    normalStock: 0,
    foilStock: 0,
    description: lorcanaCard.Body_Text || lorcanaCard.Flavor_Text || 'A Disney Lorcana card',
    version: 'normal',
    language: 'en',
    status: 'approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// POST /api/admin/import-cards
// Importa cartas desde la API de Lorcana y las guarda en Supabase
export async function POST(request: NextRequest) {
  try {
    // ⚠️ TODO: Verificar que el usuario es admin
    // const token = request.headers.get("authorization")
    // if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Supabase not configured" },
        { status: 500 }
      )
    }

    console.log('🎴 Fetching Lorcana cards from API...')

    // Fetch desde la API de Lorcana
    const response = await fetch('https://api.lorcana-api.com/cards/all')
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const lorcanaCards: LorcanaCard[] = await response.json()
    console.log(`✅ Found ${lorcanaCards.length} cards from Lorcana API`)

    // Transformar cartas
    const transformedCards = []
    let processed = 0
    let errors = 0

    for (const card of lorcanaCards) {
      try {
        const transformed = transformCard(card)
        transformedCards.push(transformed)
        processed++
      } catch (error) {
        errors++
        console.error(`✗ Error processing ${card.Name}:`, error)
      }
    }

    console.log(`✅ Transformed ${transformedCards.length} cards`)

    // ⚠️ IMPORTANTE: Solo insertar cartas NUEVAS, NO actualizar existentes
    // Paso 1: Obtener IDs de todas las cartas existentes
    const { data: existingCards, error: fetchError } = await supabaseAdmin
      .from('cards')
      .select('id')

    if (fetchError) {
      console.error('Error fetching existing cards:', fetchError)
      throw new Error('Failed to fetch existing cards')
    }

    const existingIds = new Set(existingCards?.map(c => c.id) || [])
    console.log(`📋 Found ${existingIds.size} existing cards in database`)

    // Paso 2: Filtrar solo las cartas NUEVAS (que no existen)
    const newCards = transformedCards.filter(card => !existingIds.has(card.id))
    const skippedCards = transformedCards.length - newCards.length

    console.log(`✅ ${newCards.length} new cards to import`)
    console.log(`⏭️  ${skippedCards} existing cards skipped (not modified)`)

    // Paso 3: Insertar SOLO las cartas nuevas (sin upsert)
    let imported = 0
    
    if (newCards.length > 0) {
      // Insertar en lotes de 100 para no sobrecargar
      const batchSize = 100
      for (let i = 0; i < newCards.length; i += batchSize) {
        const batch = newCards.slice(i, i + batchSize)
        
        const { data, error } = await supabaseAdmin
          .from('cards')
          .insert(batch) // ⭐ INSERT (no upsert) - solo nuevas
          .select()

        if (error) {
          console.error(`Error inserting batch ${i / batchSize + 1}:`, error)
          errors++
        } else {
          imported += data?.length || 0
          console.log(`📦 Batch ${i / batchSize + 1}: Inserted ${batch.length} new cards`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${imported} new cards. ${skippedCards} existing cards preserved.`,
      stats: {
        total: lorcanaCards.length,
        transformed: transformedCards.length,
        new: newCards.length,
        imported: imported,
        skipped: skippedCards,
        errors: errors,
      }
    })

  } catch (error) {
    console.error('Error importing cards:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


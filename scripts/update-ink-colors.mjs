// Script para actualizar el campo inkColor de las cartas existentes
// Usage:
//  SUPABASE_URL=... SUPABASE_SERVICE_ROLE=... node scripts/update-ink-colors.mjs

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

// Función para buscar una carta en la API de Lorcana por ID
async function findCardInLorcanaAPI(cardId) {
  try {
    // El ID de nuestras cartas es del formato "tfc-1" o "set-cardnum"
    // La API de Lorcana usa Set_ID y Card_Num
    const parts = cardId.split('-')
    if (parts.length < 2) return null

    const setId = parts[0].toUpperCase()
    const cardNum = parseInt(parts[1])

    if (!cardNum) return null

    // Buscar en la API de Lorcana
    const response = await fetch(`https://api.lorcana-api.com/cards/all`)
    if (!response.ok) return null

    const allCards = await response.json()
    const card = allCards.find(c => 
      c.Set_ID === setId && 
      c.Card_Num === cardNum
    )

    return card ? card.Color : null
  } catch (error) {
    console.error(`Error fetching card ${cardId} from API:`, error.message)
    return null
  }
}

// Función para buscar por nombre (fallback)
async function findCardByName(name) {
  try {
    const response = await fetch(`https://api.lorcana-api.com/cards/all`)
    if (!response.ok) return null

    const allCards = await response.json()
    // Buscar por nombre exacto o parcial
    const card = allCards.find(c => 
      c.Name === name || 
      c.Name.startsWith(name.split(' - ')[0])
    )

    return card ? card.Color : null
  } catch (error) {
    return null
  }
}

async function main() {
  console.log("🎨 Actualizando colores de tinta (inkColor) de las cartas...\n")

  // 1. Obtener TODAS las cartas de Supabase usando paginación
  console.log("📦 Obteniendo cartas de Supabase (con paginación)...")
  let allCards = []
  let page = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const from = page * pageSize
    const to = from + pageSize - 1

    const { data: cardsPage, error: fetchError } = await supabase
      .from("cards")
      .select("id, name, inkColor")
      .order("id")
      .range(from, to)

    if (fetchError) {
      console.error("❌ Error obteniendo cartas:", fetchError)
      break
    }

    if (cardsPage && cardsPage.length > 0) {
      allCards = [...allCards, ...cardsPage]
      console.log(`   Cargadas ${allCards.length} cartas... (página ${page + 1})`)
    }

    hasMore = cardsPage && cardsPage.length === pageSize
    page++

    // Safety limit: no más de 50 páginas (50,000 cartas máximo)
    if (page >= 50) {
      console.log(`⚠️  Límite de seguridad alcanzado (50 páginas). Cargadas ${allCards.length} cartas.`)
      break
    }
  }

  if (allCards.length === 0) {
    console.log("⚠️  No se encontraron cartas en la base de datos")
    process.exit(0)
  }

  console.log(`✅ Encontradas ${allCards.length} cartas en total\n`)
  
  const cards = allCards

  // 2. Cargar todas las cartas de la API de Lorcana una vez
  console.log("🌐 Cargando cartas de la API de Lorcana...")
  let lorcanaCards = []
  try {
    const response = await fetch('https://api.lorcana-api.com/cards/all')
    if (response.ok) {
      lorcanaCards = await response.json()
      console.log(`✅ Cargadas ${lorcanaCards.length} cartas de la API\n`)
    } else {
      console.error("⚠️  No se pudo cargar la API, usando búsqueda individual")
    }
  } catch (error) {
    console.error("⚠️  Error cargando API completa:", error.message)
    console.log("   Usando búsqueda individual por carta...\n")
  }

  // Filtrar solo las cartas que NO tienen color
  const cardsToUpdate = cards.filter(card => !card.inkColor || card.inkColor.trim() === "")
  console.log(`📋 Cartas que necesitan color: ${cardsToUpdate.length} de ${cards.length}\n`)

  // Crear un mapa de la API para búsqueda rápida
  const apiMap = new Map()
  if (lorcanaCards.length > 0) {
    lorcanaCards.forEach(card => {
      const key = `${card.Set_ID}-${card.Card_Num}`.toLowerCase()
      apiMap.set(key, card.Color)
      // También indexar por nombre para fallback
      if (card.Name) {
        apiMap.set(card.Name.toLowerCase(), card.Color)
      }
    })
  }

  // 3. Actualizar cada carta (solo las que no tienen color)
  let updated = 0
  let skipped = 0
  let errors = 0
  const batchSize = 50
  const updates = []

  console.log("🔄 Procesando cartas sin color...\n")

  for (let i = 0; i < cardsToUpdate.length; i++) {
    const card = cardsToUpdate[i]

    let color = null

    // Buscar en el mapa de la API
    if (apiMap.size > 0) {
      // Intentar por ID
      color = apiMap.get(card.id.toLowerCase())
      
      // Si no se encuentra, intentar por nombre
      if (!color && card.name) {
        const nameKey = card.name.split(' - ')[0].toLowerCase()
        color = apiMap.get(nameKey)
      }
    } else {
      // Fallback: búsqueda individual (más lento)
      color = await findCardInLorcanaAPI(card.id)
      if (!color && card.name) {
        color = await findCardByName(card.name)
      }
    }

    if (color) {
      updates.push({
        id: card.id,
        inkColor: color
      })
      updated++

      // Mostrar progreso cada 50 cartas
      if (updated % 50 === 0) {
        console.log(`⏳ Procesadas ${i + 1}/${cardsToUpdate.length} cartas sin color... (${updated} actualizadas)`)
      }
    } else {
      errors++
      if (errors <= 10) {
        console.log(`⚠️  No se encontró color para: ${card.name} (${card.id})`)
      }
    }

    // Actualizar en lotes para mejor rendimiento
    if (updates.length >= batchSize) {
      const successCount = await updateBatch(updates)
      updates.length = 0
    }
  }

  // Actualizar el lote final
  if (updates.length > 0) {
    const finalSuccessCount = await updateBatch(updates)
    updated = (updated - updates.length) + finalSuccessCount
  }

  console.log("\n✅ Proceso completado!")
  console.log(`   📊 Total cartas verificadas: ${cards.length}`)
  console.log(`   📋 Cartas sin color procesadas: ${cardsToUpdate.length}`)
  console.log(`   ✅ Actualizadas: ${updated}`)
  console.log(`   ⏭️  Omitidas (ya tenían color): ${cards.length - cardsToUpdate.length}`)
  console.log(`   ❌ No encontradas: ${errors}`)
}

async function updateBatch(updates) {
  // Actualizar una por una para evitar problemas con campos requeridos
  // IMPORTANTE: Solo actualizar inkColor, NO tocar stock ni precios
  let successCount = 0
  for (const update of updates) {
    // Usar update con solo inkColor para asegurar que no se toquen otros campos
    const { error } = await supabase
      .from("cards")
      .update({ 
        inkColor: update.inkColor,
        // NO incluir stock ni precios - solo actualizar inkColor
      })
      .eq("id", update.id)

    if (error) {
      console.error(`❌ Error actualizando ${update.id}:`, error.message)
    } else {
      successCount++
    }
  }
  return successCount
}

main().catch(error => {
  console.error("❌ Error fatal:", error)
  process.exit(1)
})


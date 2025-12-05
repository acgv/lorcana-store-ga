// Script para verificar el stock de las cartas en la colección del usuario
// Usage:
//  SUPABASE_URL=... SUPABASE_SERVICE_ROLE=... USER_ID=... node scripts/check-collection-stock.mjs

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
const userId = process.env.USER_ID

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  console.log("🔍 Verificando stock de cartas en colecciones de usuarios...\n")

  // Obtener todas las colecciones
  const { data: collections, error: collectionsError } = await supabase
    .from("user_collections")
    .select("user_id, card_id")
    .limit(100)

  if (collectionsError) {
    console.error("❌ Error obteniendo colecciones:", collectionsError.message)
    process.exit(1)
  }

  if (!collections || collections.length === 0) {
    console.log("⚠️  No se encontraron colecciones")
    process.exit(0)
  }

  console.log(`📦 Encontradas ${collections.length} entradas en colecciones\n`)

  // Obtener IDs únicos de cartas en colecciones
  const cardIds = [...new Set(collections.map(c => c.card_id))]
  console.log(`🎴 Cartas únicas en colecciones: ${cardIds.length}\n`)

  // Verificar stock de esas cartas
  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("id, name, normalStock, foilStock")
    .in("id", cardIds.slice(0, 100)) // Limitar a 100 para no sobrecargar

  if (cardsError) {
    console.error("❌ Error obteniendo cartas:", cardsError.message)
    process.exit(1)
  }

  if (!cards || cards.length === 0) {
    console.log("⚠️  No se encontraron cartas")
    process.exit(0)
  }

  const cardsWithStock = cards.filter(c => 
    (c.normalStock && c.normalStock > 0) || (c.foilStock && c.foilStock > 0)
  )
  const cardsWithoutStock = cards.filter(c => 
    (!c.normalStock || c.normalStock === 0) && (!c.foilStock || c.foilStock === 0)
  )

  console.log("📊 Stock de cartas en colecciones:")
  console.log(`   Total cartas verificadas: ${cards.length}`)
  console.log(`   ✅ Con stock: ${cardsWithStock.length}`)
  console.log(`   ❌ Sin stock: ${cardsWithoutStock.length}\n`)

  if (cardsWithStock.length > 0) {
    console.log("✅ Cartas en colecciones que SÍ tienen stock:")
    cardsWithStock.slice(0, 10).forEach(c => {
      const normal = c.normalStock || 0
      const foil = c.foilStock || 0
      console.log(`   - ${c.name} (${c.id}): Normal: ${normal}, Foil: ${foil}`)
    })
    if (cardsWithStock.length > 10) {
      console.log(`   ... y ${cardsWithStock.length - 10} cartas más\n`)
    }
  }

  if (cardsWithoutStock.length > 0) {
    console.log("\n❌ Cartas en colecciones que NO tienen stock:")
    console.log("   (Estas son las que no verás con stock en el constructor de mazos)")
    cardsWithoutStock.slice(0, 10).forEach(c => {
      console.log(`   - ${c.name} (${c.id})`)
    })
    if (cardsWithoutStock.length > 10) {
      console.log(`   ... y ${cardsWithoutStock.length - 10} cartas más\n`)
    }
  }

  console.log("\n💡 CONCLUSIÓN:")
  if (cardsWithoutStock.length > cardsWithStock.length) {
    console.log("   La mayoría de las cartas en tu colección NO tienen stock")
    console.log("   Por eso no ves stock en el constructor de mazos")
    console.log("   El stock existe en la BD, pero en otras cartas (no en tu colección)")
  } else {
    console.log("   Las cartas en tu colección SÍ tienen stock")
    console.log("   Si no lo ves, puede ser un problema de visualización en la UI")
  }
}

main().catch(error => {
  console.error("❌ Error fatal:", error)
  process.exit(1)
})


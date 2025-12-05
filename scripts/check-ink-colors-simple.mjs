// Script simple para verificar si las cartas tienen inkColor
// Usage:
//  SUPABASE_URL=... SUPABASE_SERVICE_ROLE=... node scripts/check-ink-colors-simple.mjs

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  console.log("🎨 Verificando colores de tinta (inkColor) en las cartas...\n")

  // 1. Verificar si la columna existe (intentando seleccionarla)
  console.log("1️⃣ Verificando si la columna 'inkColor' existe...")
  const { data: sampleCards, error: columnError } = await supabase
    .from("cards")
    .select("id, name, inkColor")
    .limit(1)

  if (columnError && (columnError.message.includes('inkColor') || columnError.message.includes('column'))) {
    console.error("❌ La columna 'inkColor' NO existe en la tabla 'cards'")
    console.error("   Error:", columnError.message)
    console.log("\n💡 Solución: Ejecuta la migración SQL:")
    console.log("   scripts/migrations/add-ink-color-to-cards.sql")
    process.exit(1)
  }

  console.log("✅ La columna 'inkColor' existe\n")

  // 2. Contar cartas con y sin color
  console.log("2️⃣ Contando cartas con y sin color...")
  const { data: allCards, error: fetchError } = await supabase
    .from("cards")
    .select("id, name, inkColor")
    .eq("status", "approved")

  if (fetchError) {
    console.error("❌ Error obteniendo cartas:", fetchError.message)
    process.exit(1)
  }

  if (!allCards || allCards.length === 0) {
    console.log("⚠️  No se encontraron cartas")
    process.exit(0)
  }

  const cardsWithColor = allCards.filter(c => c.inkColor && c.inkColor.trim() !== "")
  const cardsWithoutColor = allCards.filter(c => !c.inkColor || c.inkColor.trim() === "")

  console.log(`   Total cartas: ${allCards.length}`)
  console.log(`   ✅ Con color: ${cardsWithColor.length} (${((cardsWithColor.length / allCards.length) * 100).toFixed(1)}%)`)
  console.log(`   ❌ Sin color: ${cardsWithoutColor.length} (${((cardsWithoutColor.length / allCards.length) * 100).toFixed(1)}%)\n`)

  // 3. Ver colores únicos
  const uniqueColors = new Set(cardsWithColor.map(c => c.inkColor).filter(c => c))
  console.log(`3️⃣ Colores únicos encontrados: ${uniqueColors.size}`)
  if (uniqueColors.size > 0) {
    console.log(`   Colores: ${Array.from(uniqueColors).sort().join(", ")}\n`)
  } else {
    console.log("   ⚠️  No se encontraron colores\n")
  }

  // 4. Ejemplos de cartas con color
  if (cardsWithColor.length > 0) {
    console.log("4️⃣ Ejemplos de cartas CON color:")
    cardsWithColor.slice(0, 10).forEach(c => {
      console.log(`   - ${c.name} (${c.id}): ${c.inkColor}`)
    })
    if (cardsWithColor.length > 10) {
      console.log(`   ... y ${cardsWithColor.length - 10} cartas más\n`)
    } else {
      console.log()
    }
  }

  // 5. Ejemplos de cartas sin color
  if (cardsWithoutColor.length > 0) {
    console.log("5️⃣ Ejemplos de cartas SIN color:")
    cardsWithoutColor.slice(0, 10).forEach(c => {
      console.log(`   - ${c.name} (${c.id})`)
    })
    if (cardsWithoutColor.length > 10) {
      console.log(`   ... y ${cardsWithoutColor.length - 10} cartas más\n`)
    } else {
      console.log()
    }
  }

  // 6. Verificar cartas en colecciones
  console.log("6️⃣ Verificando cartas en colecciones de usuarios...")
  const { data: collections, error: collectionsError } = await supabase
    .from("user_collections")
    .select("card_id")
    .limit(100)

  if (!collectionsError && collections && collections.length > 0) {
    const collectionCardIds = [...new Set(collections.map(c => c.card_id))]
    const { data: collectionCards, error: collectionCardsError } = await supabase
      .from("cards")
      .select("id, name, inkColor")
      .in("id", collectionCardIds.slice(0, 100)) // Limitar a 100 para no sobrecargar

    if (!collectionCardsError && collectionCards) {
      const collectionCardsWithColor = collectionCards.filter(c => c.inkColor && c.inkColor.trim() !== "")
      console.log(`   Cartas en colecciones verificadas: ${collectionCards.length}`)
      console.log(`   ✅ Con color: ${collectionCardsWithColor.length}`)
      console.log(`   ❌ Sin color: ${collectionCards.length - collectionCardsWithColor.length}\n`)

      if (collectionCardsWithColor.length > 0) {
        console.log("   Ejemplos de cartas en colecciones CON color:")
        collectionCardsWithColor.slice(0, 5).forEach(c => {
          console.log(`     - ${c.name} (${c.id}): ${c.inkColor}`)
        })
      }
    }
  }

  // 7. Recomendación
  console.log("\n" + "=".repeat(60))
  console.log("📋 RESUMEN:")
  console.log("=".repeat(60))
  
  if (cardsWithColor.length === 0) {
    console.log("❌ Ninguna carta tiene color")
    console.log("\n💡 Solución:")
    console.log("   1. Ejecuta la migración SQL si no lo has hecho:")
    console.log("      scripts/migrations/add-ink-color-to-cards.sql")
    console.log("   2. Ejecuta el script de actualización:")
    console.log("      pnpm db:update-colors")
  } else if (cardsWithoutColor.length > 0) {
    console.log(`✅ ${cardsWithColor.length} cartas tienen color`)
    console.log(`⚠️  ${cardsWithoutColor.length} cartas aún no tienen color`)
    console.log("\n💡 Para actualizar las cartas sin color:")
    console.log("   pnpm db:update-colors")
  } else {
    console.log(`✅ ¡Todas las cartas tienen color!`)
  }
  
  console.log()
}

main().catch(error => {
  console.error("❌ Error fatal:", error)
  process.exit(1)
})


// Script para verificar el stock de las cartas
// Usage:
//  SUPABASE_URL=... SUPABASE_SERVICE_ROLE=... node scripts/verify-stock.mjs

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  console.log("📦 Verificando stock de las cartas...\n")

  // Obtener una muestra de cartas con sus stocks
  const { data: cards, error } = await supabase
    .from("cards")
    .select("id, name, normalStock, foilStock")
    .limit(20)

  if (error) {
    console.error("❌ Error obteniendo cartas:", error)
    process.exit(1)
  }

  if (!cards || cards.length === 0) {
    console.log("⚠️  No se encontraron cartas")
    process.exit(0)
  }

  console.log(`📊 Muestra de ${cards.length} cartas:\n`)

  const cardsWithStock = cards.filter(c => (c.normalStock && c.normalStock > 0) || (c.foilStock && c.foilStock > 0))
  const cardsWithoutStock = cards.filter(c => (!c.normalStock || c.normalStock === 0) && (!c.foilStock || c.foilStock === 0))

  console.log(`✅ Cartas CON stock: ${cardsWithStock.length}`)
  console.log(`❌ Cartas SIN stock: ${cardsWithoutStock.length}\n`)

  if (cardsWithStock.length > 0) {
    console.log("📦 Ejemplos de cartas CON stock:")
    cardsWithStock.slice(0, 5).forEach(c => {
      console.log(`   - ${c.name} (${c.id})`)
      console.log(`     Normal: ${c.normalStock || 0}, Foil: ${c.foilStock || 0}`)
    })
  }

  if (cardsWithoutStock.length > 0) {
    console.log("\n⚠️  Ejemplos de cartas SIN stock:")
    cardsWithoutStock.slice(0, 5).forEach(c => {
      console.log(`   - ${c.name} (${c.id})`)
      console.log(`     Normal: ${c.normalStock || 0}, Foil: ${c.foilStock || 0}`)
    })
  }

  // Verificar totales
  const { data: allCards, error: allError } = await supabase
    .from("cards")
    .select("normalStock, foilStock")

  if (!allError && allCards) {
    const totalNormalStock = allCards.reduce((sum, c) => sum + (c.normalStock || 0), 0)
    const totalFoilStock = allCards.reduce((sum, c) => sum + (c.foilStock || 0), 0)
    const cardsWithAnyStock = allCards.filter(c => (c.normalStock && c.normalStock > 0) || (c.foilStock && c.foilStock > 0)).length

    console.log(`\n📈 Estadísticas totales:`)
    console.log(`   Total cartas: ${allCards.length}`)
    console.log(`   Cartas con stock: ${cardsWithAnyStock}`)
    console.log(`   Stock normal total: ${totalNormalStock}`)
    console.log(`   Stock foil total: ${totalFoilStock}`)
  }
}

main().catch(error => {
  console.error("❌ Error fatal:", error)
  process.exit(1)
})


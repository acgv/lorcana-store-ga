// Script para verificar si las cartas tienen el campo inkColor
// Usage:
//  SUPABASE_URL=... SUPABASE_SERVICE_ROLE=... node scripts/verify-ink-colors.mjs

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  console.log("🔍 Verificando colores de tinta (inkColor) en las cartas...\n")

  // 1. Verificar si la columna existe
  console.log("📋 Verificando si la columna inkColor existe...")
  const { data: columnInfo, error: columnError } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cards' 
        AND column_name = 'inkColor'
      `
    })
    .catch(() => ({ data: null, error: null }))

  // Método alternativo: intentar seleccionar la columna directamente
  const { data: sampleCards, error: sampleError } = await supabase
    .from("cards")
    .select("id, name, inkColor")
    .limit(5)

  if (sampleError) {
    if (sampleError.message.includes('inkColor') || sampleError.message.includes('column')) {
      console.error("❌ La columna 'inkColor' NO existe en la tabla 'cards'")
      console.error("   Error:", sampleError.message)
      console.log("\n💡 Solución: Ejecuta la migración SQL:")
      console.log("   scripts/migrations/add-ink-color-to-cards.sql")
      process.exit(1)
    } else {
      console.error("❌ Error al consultar:", sampleError.message)
      process.exit(1)
    }
  }

  console.log("✅ La columna 'inkColor' existe\n")

  // 2. Contar cartas con y sin color
  console.log("📊 Analizando cartas...")
  const { data: allCards, error: fetchError } = await supabase
    .from("cards")
    .select("id, name, inkColor")

  if (fetchError) {
    console.error("❌ Error obteniendo cartas:", fetchError)
    process.exit(1)
  }

  if (!allCards || allCards.length === 0) {
    console.log("⚠️  No se encontraron cartas en la base de datos")
    process.exit(0)
  }

  const cardsWithColor = allCards.filter(c => c.inkColor && c.inkColor.trim() !== "")
  const cardsWithoutColor = allCards.filter(c => !c.inkColor || c.inkColor.trim() === "")

  console.log(`\n📈 Estadísticas:`)
  console.log(`   Total cartas: ${allCards.length}`)
  console.log(`   ✅ Con color: ${cardsWithColor.length} (${((cardsWithColor.length / allCards.length) * 100).toFixed(1)}%)`)
  console.log(`   ❌ Sin color: ${cardsWithoutColor.length} (${((cardsWithoutColor.length / allCards.length) * 100).toFixed(1)}%)`)

  // 3. Mostrar colores únicos
  const uniqueColors = new Set(cardsWithColor.map(c => c.inkColor).filter(c => c))
  console.log(`\n🎨 Colores únicos encontrados: ${uniqueColors.size}`)
  if (uniqueColors.size > 0) {
    console.log(`   Colores: ${Array.from(uniqueColors).sort().join(", ")}`)
  }

  // 4. Mostrar ejemplos
  if (cardsWithColor.length > 0) {
    console.log(`\n✅ Ejemplos de cartas CON color:`)
    cardsWithColor.slice(0, 5).forEach(c => {
      console.log(`   - ${c.name} (${c.id}): ${c.inkColor}`)
    })
  }

  if (cardsWithoutColor.length > 0) {
    console.log(`\n❌ Ejemplos de cartas SIN color:`)
    cardsWithoutColor.slice(0, 5).forEach(c => {
      console.log(`   - ${c.name} (${c.id})`)
    })
  }

  // 5. Recomendación
  if (cardsWithoutColor.length > 0) {
    console.log(`\n💡 Recomendación:`)
    console.log(`   Ejecuta el script de actualización:`)
    console.log(`   pnpm db:update-colors`)
    console.log(`   Esto actualizará las ${cardsWithoutColor.length} cartas sin color.`)
  } else {
    console.log(`\n✅ ¡Todas las cartas tienen color!`)
  }
}

main().catch(error => {
  console.error("❌ Error fatal:", error)
  process.exit(1)
})


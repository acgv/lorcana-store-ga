// Script para buscar stock manual en Supabase
// Busca cualquier rastro de stock que pueda haber quedado
// Usage:
//  SUPABASE_URL=... SUPABASE_SERVICE_ROLE=... node scripts/search-stock-in-db.mjs

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  console.log("🔍 Buscando stock manual en Supabase...\n")

  // 1. Obtener TODAS las cartas con su stock
  console.log("📦 Obteniendo todas las cartas de la base de datos...")
  let allCards = []
  let page = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const from = page * pageSize
    const to = from + pageSize - 1

    const { data, error } = await supabase
      .from("cards")
      .select("id, name, normalStock, foilStock, price, foilPrice, updatedAt")
      .range(from, to)

    if (error) {
      console.error("❌ Error obteniendo cartas:", error.message)
      break
    }

    if (data && data.length > 0) {
      allCards = [...allCards, ...data]
      console.log(`   Cargadas ${allCards.length} cartas...`)
    }

    hasMore = data && data.length === pageSize
    page++

    if (page >= 50) break // Safety limit
  }

  console.log(`\n✅ Total cartas obtenidas: ${allCards.length}\n`)

  // 2. Analizar stock
  const cardsWithNormalStock = allCards.filter(c => c.normalStock && c.normalStock > 0)
  const cardsWithFoilStock = allCards.filter(c => c.foilStock && c.foilStock > 0)
  const cardsWithAnyStock = allCards.filter(c => 
    (c.normalStock && c.normalStock > 0) || (c.foilStock && c.foilStock > 0)
  )
  const cardsWithoutStock = allCards.filter(c => 
    (!c.normalStock || c.normalStock === 0) && (!c.foilStock || c.foilStock === 0)
  )

  console.log("📊 Análisis de Stock:")
  console.log(`   Total cartas: ${allCards.length}`)
  console.log(`   ✅ Con stock normal: ${cardsWithNormalStock.length}`)
  console.log(`   ✅ Con stock foil: ${cardsWithFoilStock.length}`)
  console.log(`   ✅ Con cualquier stock: ${cardsWithAnyStock.length}`)
  console.log(`   ❌ Sin stock: ${cardsWithoutStock.length}\n`)

  // 3. Mostrar cartas con stock (si hay)
  if (cardsWithAnyStock.length > 0) {
    console.log("✅ Cartas que SÍ tienen stock:")
    console.log("   (Estas son las que se preservaron)\n")
    
    const totalNormal = cardsWithAnyStock.reduce((sum, c) => sum + (c.normalStock || 0), 0)
    const totalFoil = cardsWithAnyStock.reduce((sum, c) => sum + (c.foilStock || 0), 0)
    
    console.log(`   Total unidades normal: ${totalNormal}`)
    console.log(`   Total unidades foil: ${totalFoil}\n`)
    
    // Mostrar primeras 20 cartas con stock
    cardsWithAnyStock.slice(0, 20).forEach(c => {
      const normal = c.normalStock || 0
      const foil = c.foilStock || 0
      console.log(`   - ${c.name} (${c.id})`)
      console.log(`     Normal: ${normal}, Foil: ${foil}`)
    })
    
    if (cardsWithAnyStock.length > 20) {
      console.log(`   ... y ${cardsWithAnyStock.length - 20} cartas más con stock\n`)
    }
  } else {
    console.log("❌ NO se encontró stock en ninguna carta")
    console.log("   Esto confirma que el stock se perdió completamente\n")
  }

  // 4. Buscar en logs o historial (si existe)
  console.log("🔍 Buscando en tablas de historial...")
  
  // Verificar si existe tabla de logs
  let logs = null
  let logsError = null
  try {
    const result = await supabase
      .from("logs")
      .select("action, details, timestamp")
      .ilike("action", "%stock%")
      .order("timestamp", { ascending: false })
      .limit(50)
    logs = result.data
    logsError = result.error
  } catch (e) {
    logsError = e
  }

  if (!logsError && logs && logs.length > 0) {
    console.log(`   ✅ Encontrados ${logs.length} logs relacionados con stock`)
    logs.slice(0, 10).forEach(log => {
      console.log(`   - ${log.action} (${new Date(log.timestamp).toLocaleString()})`)
    })
  } else {
    console.log("   ⚠️  No se encontraron logs de stock o la tabla no existe")
  }

  // 5. Verificar fechas de actualización
  console.log("\n📅 Analizando fechas de actualización...")
  const recentUpdates = allCards
    .filter(c => c.updatedAt)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 10)

  if (recentUpdates.length > 0) {
    console.log("   Últimas cartas actualizadas:")
    recentUpdates.forEach(c => {
      const date = new Date(c.updatedAt).toLocaleString()
      const hasStock = (c.normalStock && c.normalStock > 0) || (c.foilStock && c.foilStock > 0)
      console.log(`   - ${c.name}: ${date} ${hasStock ? '✅ (tiene stock)' : '❌ (sin stock)'}`)
    })
  }

  // 6. Resumen y recomendaciones
  console.log("\n" + "=".repeat(60))
  console.log("📋 RESUMEN:")
  console.log("=".repeat(60))
  
  if (cardsWithAnyStock.length > 0) {
    console.log(`✅ Se encontró stock en ${cardsWithAnyStock.length} cartas`)
    console.log(`   Estas cartas conservaron su stock manual`)
    console.log(`\n💡 Si perdiste stock en otras cartas:`)
    console.log(`   1. Verifica si tienes backup en Supabase Dashboard`)
    console.log(`   2. O tendrás que volver a cargar el stock manualmente`)
  } else {
    console.log(`❌ NO se encontró stock en ninguna carta`)
    console.log(`\n💡 Opciones para restaurar:`)
    console.log(`   1. Restaurar desde backup de Supabase (si existe)`)
    console.log(`   2. Cargar stock manualmente desde el panel de admin`)
    console.log(`   3. Si tienes un export SQL, ejecutarlo en Supabase SQL Editor`)
  }
  
  console.log("\n")
}

main().catch(error => {
  console.error("❌ Error fatal:", error)
  process.exit(1)
})


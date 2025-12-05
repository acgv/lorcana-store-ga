// Script para restaurar stock desde un backup
// Este script asume que tienes un backup de la base de datos con el stock original
// Usage:
//  SUPABASE_URL=... SUPABASE_SERVICE_ROLE=... node scripts/restore-stock-from-backup.mjs

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  console.log("⚠️  IMPORTANTE: Este script requiere un backup de la base de datos")
  console.log("   Si no tienes backup, este script NO puede restaurar el stock perdido\n")
  
  console.log("💡 Opciones para restaurar stock:")
  console.log("   1. Si tienes un backup de Supabase, restáuralo desde el dashboard")
  console.log("   2. Si tienes un export SQL, ejecútalo en Supabase SQL Editor")
  console.log("   3. Si no tienes backup, tendrás que volver a cargar el stock manualmente\n")
  
  console.log("📋 Para verificar el stock actual, ejecuta:")
  console.log("   pnpm db:verify-stock\n")
  
  console.log("🔍 Verificando stock actual...")
  
  const { data: cards, error } = await supabase
    .from("cards")
    .select("id, name, normalStock, foilStock")
    .limit(10)
  
  if (error) {
    console.error("❌ Error:", error.message)
    process.exit(1)
  }
  
  const cardsWithStock = cards?.filter(c => (c.normalStock && c.normalStock > 0) || (c.foilStock && c.foilStock > 0)) || []
  
  console.log(`\n📊 Estado actual:`)
  console.log(`   Cartas verificadas: ${cards?.length || 0}`)
  console.log(`   Cartas con stock: ${cardsWithStock.length}`)
  
  if (cardsWithStock.length === 0) {
    console.log("\n⚠️  No se encontró stock en las cartas verificadas")
    console.log("   Esto confirma que el stock se perdió")
  }
}

main().catch(error => {
  console.error("❌ Error fatal:", error)
  process.exit(1)
})


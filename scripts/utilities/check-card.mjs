// Script para verificar si una carta existe en la base de datos
// Uso: node scripts/utilities/check-card.mjs "prueba"

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Cargar variables de entorno
const envPath = join(__dirname, "../../.env.local")
let envContent = ""
try {
  envContent = readFileSync(envPath, "utf-8")
} catch (error) {
  console.error("❌ No se encontró .env.local")
  process.exit(1)
}

const url = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim()
const key = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim()

if (!url || !key) {
  console.error("❌ Faltan variables de entorno")
  process.exit(1)
}

const supabase = createClient(url, key)

const searchTerm = process.argv[2] || "prueba"

async function checkCard() {
  console.log(`🔍 Buscando cartas con nombre que contenga "${searchTerm}"...\n`)

  // Buscar por nombre
  const { data: byName, error: nameError } = await supabase
    .from("cards")
    .select("*")
    .ilike("name", `%${searchTerm}%`)

  if (nameError) {
    console.error("❌ Error buscando por nombre:", nameError.message)
  } else {
    console.log(`📋 Encontradas ${byName?.length || 0} cartas por nombre:`)
    byName?.forEach((card) => {
      console.log(`  - ID: ${card.id}`)
      console.log(`    Nombre: ${card.name}`)
      console.log(`    Set: ${card.set}`)
      console.log(`    Número: ${card.number}`)
      console.log(`    CardNumber: ${card.cardNumber}`)
      console.log(`    Status: ${card.status}`)
      console.log(`    ProductType: ${card.productType || "card"}`)
      console.log("")
    })
  }

  // Buscar por cardNumber que contenga 205
  const { data: byNumber, error: numberError } = await supabase
    .from("cards")
    .select("*")
    .ilike("cardNumber", "%205%")

  if (numberError) {
    console.error("❌ Error buscando por número:", numberError.message)
  } else {
    console.log(`📋 Encontradas ${byNumber?.length || 0} cartas con número 205:`)
    byNumber?.forEach((card) => {
      console.log(`  - ID: ${card.id}`)
      console.log(`    Nombre: ${card.name}`)
      console.log(`    Set: ${card.set}`)
      console.log(`    CardNumber: ${card.cardNumber}`)
      console.log(`    Status: ${card.status}`)
      console.log("")
    })
  }

  // Buscar todas las cartas del set firstChapter con número 205
  const { data: bySetAndNumber, error: setError } = await supabase
    .from("cards")
    .select("*")
    .eq("set", "firstChapter")
    .eq("number", 205)

  if (setError) {
    console.error("❌ Error buscando por set y número:", setError.message)
  } else {
    console.log(`📋 Encontradas ${bySetAndNumber?.length || 0} cartas del set firstChapter con número 205:`)
    bySetAndNumber?.forEach((card) => {
      console.log(`  - ID: ${card.id}`)
      console.log(`    Nombre: ${card.name}`)
      console.log(`    Status: ${card.status}`)
      console.log(`    ProductType: ${card.productType || "card"}`)
      console.log("")
    })
  }

  // Verificar últimas 5 cartas creadas
  const { data: recent, error: recentError } = await supabase
    .from("cards")
    .select("*")
    .order("createdAt", { ascending: false })
    .limit(5)

  if (recentError) {
    console.error("❌ Error buscando cartas recientes:", recentError.message)
  } else {
    console.log(`📋 Últimas 5 cartas creadas:`)
    recent?.forEach((card) => {
      console.log(`  - ID: ${card.id}`)
      console.log(`    Nombre: ${card.name}`)
      console.log(`    Set: ${card.set}`)
      console.log(`    Status: ${card.status}`)
      console.log(`    Created: ${card.createdAt || card.createdat}`)
      console.log("")
    })
  }
}

checkCard().catch(console.error)


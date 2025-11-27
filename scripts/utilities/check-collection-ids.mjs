#!/usr/bin/env node

/**
 * Script para verificar IDs de cartas en la colección vs catálogo
 * Uso: node scripts/utilities/check-collection-ids.mjs [userId]
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Cargar variables de entorno manualmente
function loadEnv() {
  try {
    const envPath = resolve(__dirname, "../../.env.local")
    const envFile = readFileSync(envPath, "utf-8")
    const envVars = {}
    
    envFile.split("\n").forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=")
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").replace(/^["']|["']$/g, "")
          envVars[key.trim()] = value.trim()
        }
      }
    })
    
    Object.assign(process.env, envVars)
  } catch (error) {
    console.warn("⚠️  Could not load .env.local, using process.env")
  }
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  const userId = process.argv[2]
  
  if (!userId) {
    console.error("❌ Please provide a userId as argument")
    console.log("Usage: node scripts/utilities/check-collection-ids.mjs <userId>")
    process.exit(1)
  }

  console.log(`🔍 Checking collection for user: ${userId}\n`)

  try {
    // 1. Obtener todas las cartas del Set 9 (fabled)
    console.log("📦 Fetching Set 9 (fabled) cards from cards table...")
    const { data: set9Cards, error: cardsError } = await supabase
      .from("cards")
      .select("id, name, number, set, cardNumber")
      .eq("set", "fabled")
      .eq("status", "approved")
      .order("number", { ascending: true })

    if (cardsError) {
      console.error("❌ Error fetching Set 9 cards:", cardsError)
      process.exit(1)
    }

    console.log(`✅ Found ${set9Cards.length} Set 9 cards in cards table\n`)

    // 2. Obtener la colección del usuario
    console.log(`📚 Fetching collection for user ${userId}...`)
    const { data: collection, error: collectionError } = await supabase
      .from("user_collections")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "owned")

    if (collectionError) {
      console.error("❌ Error fetching collection:", collectionError)
      process.exit(1)
    }

    console.log(`✅ Found ${collection.length} items in collection\n`)

    // 3. Filtrar items del Set 9
    const set9CollectionItems = collection.filter(item => {
      // Buscar si el card_id coincide con alguna carta del Set 9
      return set9Cards.some(card => {
        const cardIdNormalized = String(card.id).trim().toLowerCase()
        const itemIdNormalized = String(item.card_id).trim().toLowerCase()
        return cardIdNormalized === itemIdNormalized
      })
    })

    console.log(`🎯 Found ${set9CollectionItems.length} Set 9 items in collection\n`)

    // 4. Comparar IDs
    console.log("🔍 Comparing IDs...\n")
    console.log("=" .repeat(80))
    
    const mismatches = []
    const matches = []

    for (const item of set9CollectionItems) {
      const matchingCard = set9Cards.find(card => {
        const cardIdNormalized = String(card.id).trim().toLowerCase()
        const itemIdNormalized = String(item.card_id).trim().toLowerCase()
        return cardIdNormalized === itemIdNormalized
      })

      if (matchingCard) {
        matches.push({
          collectionId: item.card_id,
          cardId: matchingCard.id,
          name: matchingCard.name,
          number: matchingCard.number,
          version: item.version,
          quantity: item.quantity
        })
      } else {
        mismatches.push({
          collectionId: item.card_id,
          name: "NOT FOUND IN CARDS TABLE",
          version: item.version,
          quantity: item.quantity
        })
      }
    }

    // Mostrar matches
    console.log("\n✅ MATCHES (IDs coinciden):")
    console.log("-".repeat(80))
    if (matches.length > 0) {
      matches.forEach(m => {
        console.log(`  ✓ Card #${m.number}: ${m.name}`)
        console.log(`    Collection ID: "${m.collectionId}"`)
        console.log(`    Cards Table ID: "${m.cardId}"`)
        console.log(`    Version: ${m.version}, Quantity: ${m.quantity}`)
        console.log()
      })
    } else {
      console.log("  No matches found")
    }

    // Mostrar mismatches
    if (mismatches.length > 0) {
      console.log("\n❌ MISMATCHES (IDs NO coinciden):")
      console.log("-".repeat(80))
      mismatches.forEach(m => {
        console.log(`  ✗ Collection ID: "${m.collectionId}"`)
        console.log(`    ${m.name}`)
        console.log(`    Version: ${m.version}, Quantity: ${m.quantity}`)
        console.log()
      })
    }

    // 5. Verificar cartas del Set 9 que deberían estar en la colección pero no aparecen
    console.log("\n🔍 Checking Set 9 cards that might be missing from collection...")
    console.log("-".repeat(80))
    
    const set9CardIds = set9Cards.map(c => String(c.id).trim().toLowerCase())
    const collectionCardIds = collection.map(c => String(c.card_id).trim().toLowerCase())
    
    const missingFromCollection = set9Cards.filter(card => {
      const cardIdNormalized = String(card.id).trim().toLowerCase()
      return !collectionCardIds.includes(cardIdNormalized)
    })

    if (missingFromCollection.length > 0) {
      console.log(`\n⚠️  ${missingFromCollection.length} Set 9 cards NOT in collection:`)
      missingFromCollection.slice(0, 10).forEach(card => {
        console.log(`  - Card #${card.number}: ${card.name} (ID: "${card.id}")`)
      })
      if (missingFromCollection.length > 10) {
        console.log(`  ... and ${missingFromCollection.length - 10} more`)
      }
    } else {
      console.log("\n✅ All Set 9 cards are in collection (or collection is empty)")
    }

    // 6. Resumen
    console.log("\n" + "=".repeat(80))
    console.log("\n📊 SUMMARY:")
    console.log(`  Total Set 9 cards in DB: ${set9Cards.length}`)
    console.log(`  Set 9 items in collection: ${set9CollectionItems.length}`)
    console.log(`  Matches: ${matches.length}`)
    console.log(`  Mismatches: ${mismatches.length}`)
    console.log(`  Set 9 cards NOT in collection: ${missingFromCollection.length}`)

    // 7. Mostrar ejemplo de IDs para comparación
    if (set9Cards.length > 0 && set9CollectionItems.length > 0) {
      console.log("\n📋 Sample IDs for comparison:")
      console.log("-".repeat(80))
      console.log("First Set 9 card from cards table:")
      console.log(`  ID: "${set9Cards[0].id}"`)
      console.log(`  Normalized: "${String(set9Cards[0].id).trim().toLowerCase()}"`)
      if (set9CollectionItems.length > 0) {
        console.log("\nFirst Set 9 item from collection:")
        console.log(`  card_id: "${set9CollectionItems[0].card_id}"`)
        console.log(`  Normalized: "${String(set9CollectionItems[0].card_id).trim().toLowerCase()}"`)
      }
    }

  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

main()


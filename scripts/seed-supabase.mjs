// Seed Supabase with imported-cards.json (no TypeScript required)
// Usage:
//  SUPABASE_URL=... SUPABASE_SERVICE_ROLE=... node scripts/seed-supabase.mjs

import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  const filePath = path.resolve(__dirname, "../lib/imported-cards.json")
  if (!fs.existsSync(filePath)) {
    console.error("lib/imported-cards.json not found. Run npm run import:cards first or use mock-data.")
    process.exit(1)
  }
  const raw = fs.readFileSync(filePath, "utf-8")
  const cards = JSON.parse(raw)

  console.log(`📦 Loading ${cards.length} cards from file...`)
  
  // Obtener todas las cartas existentes para preservar precios y stock
  console.log("🔍 Fetching existing cards from database...")
  const { data: existingCards, error: fetchError } = await supabase
    .from("cards")
    .select("id, price, foilPrice, normalStock, foilStock")
  
  if (fetchError) {
    console.error("Error fetching existing cards:", fetchError)
    process.exit(1)
  }
  
  const existingCardsMap = new Map()
  existingCards?.forEach(card => {
    existingCardsMap.set(card.id, {
      price: card.price,
      foilPrice: card.foilPrice,
      normalStock: card.normalStock,
      foilStock: card.foilStock,
    })
  })
  
  console.log(`✅ Found ${existingCardsMap.size} existing cards in database\n`)

  let created = 0
  let updated = 0
  let preserved = 0

  const rows = cards.map((c) => {
    const existing = existingCardsMap.get(c.id)
    const isNew = !existing
    
    // Si la carta ya existe, preservar precio y stock
    // Si es nueva, usar valores del JSON (precio estándar, stock 0)
    const row = {
      id: c.id || `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: c.name,
      image: c.image,
      set: c.set,
      rarity: c.rarity,
      type: c.type,
      number: Number(c.number) || 0,
      cardNumber: c.cardNumber ?? String(c.number ?? ""),
      description: c.description ?? null,
      version: c.version ?? "normal",
      language: c.language ?? "en",
      status: c.status ?? "approved",
    }
    
    if (isNew) {
      // Nueva carta: usar precios estándar y stock 0
      row.price = c.price ?? null
      row.foilPrice = c.foilPrice ?? null
      row.normalStock = c.normalStock ?? c.stock ?? 0
      row.foilStock = c.foilStock ?? 0
      created++
    } else {
      // Carta existente: preservar precio y stock
      row.price = existing.price
      row.foilPrice = existing.foilPrice
      row.normalStock = existing.normalStock
      row.foilStock = existing.foilStock
      preserved++
      updated++
    }
    
    return row
  })

  console.log(`📊 Summary:`)
  console.log(`   - New cards: ${created}`)
  console.log(`   - Existing cards (preserving price/stock): ${preserved}`)
  console.log(`\n🔄 Upserting ${rows.length} cards into Supabase (chunked + retries)...`)
  
  const chunkSize = 50
  const maxRetries = 3
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    let attempt = 0
    while (true) {
      try {
        const { error } = await supabase.from("cards").upsert(chunk, { onConflict: "id" })
        if (error) throw error
        console.log(`✓ Processed ${Math.min(i + chunkSize, rows.length)} / ${rows.length}`)
        break
      } catch (err) {
        attempt++
        if (attempt > maxRetries) {
          console.error(`Seed error at chunk ${i / chunkSize + 1}:`, err)
          process.exit(1)
        }
        const delayMs = 500 * attempt
        console.warn(`Retrying chunk ${i / chunkSize + 1} in ${delayMs}ms...`)
        await new Promise(r => setTimeout(r, delayMs))
      }
    }
  }
  
  console.log("\n✅ Seed completed!")
  console.log(`   - Created: ${created} new cards (with standard prices and 0 stock)`)
  console.log(`   - Updated: ${updated} existing cards (preserved prices and stock)`)
}

main()



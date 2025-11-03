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
const serviceKey = process.env.SUPABASE_SERVICE_ROLE

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

  const rows = cards.map((c) => ({
    id: c.id || `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: c.name,
    image: c.image,
    set: c.set,
    rarity: c.rarity,
    type: c.type,
    number: Number(c.number) || 0,
    cardNumber: c.cardNumber ?? String(c.number ?? ""),
    price: c.price ?? null,
    foilPrice: c.foilPrice ?? null,
    description: c.description ?? null,
    version: c.version ?? "normal",
    language: c.language ?? "en",
    status: c.status ?? "approved",
    normalStock: c.normalStock ?? c.stock ?? 10,
    foilStock: c.foilStock ?? (c.foilPrice ? 5 : 0),
  }))

  console.log(`Upserting ${rows.length} cards into Supabase (chunked + retries)...`)
  const chunkSize = 50
  const maxRetries = 3
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    let attempt = 0
    while (true) {
      try {
        const { error } = await supabase.from("cards").upsert(chunk, { onConflict: "id" })
        if (error) throw error
        console.log(`✓ Inserted ${Math.min(i + chunkSize, rows.length)} / ${rows.length}`)
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
  console.log("Seed completed.")
}

main()



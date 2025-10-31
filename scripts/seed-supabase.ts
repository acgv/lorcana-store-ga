// Seed Supabase with imported-cards.json
// Usage:
//  SUPABASE_URL=... SUPABASE_SERVICE_ROLE=... pnpm ts-node scripts/seed-supabase.ts

import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  const filePath = path.resolve(process.cwd(), "lib/imported-cards.json")
  if (!fs.existsSync(filePath)) {
    console.error("lib/imported-cards.json not found. Run npm run import:cards first or use mock-data.")
    process.exit(1)
  }
  const raw = fs.readFileSync(filePath, "utf-8")
  const cards = JSON.parse(raw)

  // Prepare rows
  const rows = cards.map((c: any) => ({
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

  console.log(`Upserting ${rows.length} cards into Supabase...`)
  const { error } = await supabase.from("cards").upsert(rows, { onConflict: "id" })
  if (error) {
    console.error("Seed error:", error)
    process.exit(1)
  }
  console.log("Seed completed.")
}

main()



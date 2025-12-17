// Backfill inkCost in Supabase without touching price/stock.
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE=... node scripts/backfill-ink-cost.mjs
//
// Behavior:
// - Fetches cards from Lorcana API
// - Skips promotional cards (same logic as import script)
// - Updates ONLY cards where inkCost is NULL (or missing)
// - Does NOT update price, foilPrice, normalStock, foilStock, etc.

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
})

function isPromotional(lorcanaCard) {
  const img = lorcanaCard?.Image
  if (!img) return false
  return img.includes("/promo") || img.includes("/promo2/") || img.includes("/promo3/")
}

function toCardId(lorcanaCard) {
  // Matches existing ID strategy in scripts/import-lorcana-data.js
  return `${lorcanaCard.Set_ID}-${lorcanaCard.Card_Num}`.toLowerCase()
}

async function fetchAllLorcanaCards() {
  const url = "https://api.lorcana-api.com/cards/all"
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Lorcana API error: ${res.status}`)
  return await res.json()
}

async function main() {
  console.log("🎴 Fetching Lorcana cards from API...")
  const lorcanaCards = await fetchAllLorcanaCards()
  console.log(`✅ API returned ${lorcanaCards.length} cards`)

  console.log("🔍 Fetching cards with NULL inkCost from Supabase...")
  // Paginate to avoid 1000 limit
  let page = 0
  const pageSize = 1000
  let hasMore = true
  const nullInkCostIds = new Set()

  while (hasMore) {
    const from = page * pageSize
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from("cards")
      .select("id")
      .is("inkCost", null)
      .range(from, to)

    if (error) throw error
    if (data?.length) data.forEach((r) => nullInkCostIds.add(String(r.id)))
    hasMore = !!(data && data.length === pageSize)
    page++
    if (page >= 50) break
  }

  console.log(`✅ Found ${nullInkCostIds.size} cards with NULL inkCost`)
  if (nullInkCostIds.size === 0) {
    console.log("Nothing to backfill. Exiting.")
    return
  }

  // Build updates from API data (only for ids that exist and are null in DB)
  let skippedPromos = 0
  let missingCost = 0
  let candidates = 0
  const updates = []

  for (const c of lorcanaCards) {
    if (isPromotional(c)) {
      skippedPromos++
      continue
    }
    const id = toCardId(c)
    if (!nullInkCostIds.has(id)) continue
    const cost = typeof c.Cost === "number" ? c.Cost : c.Cost ? Number(c.Cost) : null
    if (cost === null || Number.isNaN(cost)) {
      missingCost++
      continue
    }
    candidates++
    updates.push({ id, inkCost: cost })
  }

  console.log(
    `📦 Candidates to update: ${updates.length} (skipped promos: ${skippedPromos}, missing cost: ${missingCost})`
  )

  if (updates.length === 0) {
    console.log("No updates to apply (maybe API ids don't match DB ids).")
    return
  }

  // Apply updates in chunks (safe update: only rows where inkCost is null)
  const chunkSize = 200
  let updated = 0
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize)
    // Use upsert to set inkCost, but protect against overwriting by requiring inkCost IS NULL.
    // Supabase doesn't support conditional upsert easily; so we do individual updates per chunk via RPC-like pattern:
    // Update by id + inkCost is null.
    // (We must do per-row updates because bulk update with different values isn't supported in PostgREST.)
    for (const row of chunk) {
      const { error } = await supabase
        .from("cards")
        .update({ inkCost: row.inkCost })
        .eq("id", row.id)
        .is("inkCost", null)
      if (error) throw error
      updated++
    }
    console.log(`✓ Updated ${Math.min(i + chunkSize, updates.length)} / ${updates.length}`)
  }

  console.log(`✅ Backfill complete. Updated ${updated} rows.`)
}

main().catch((err) => {
  console.error("❌ Backfill failed:", err)
  process.exit(1)
})



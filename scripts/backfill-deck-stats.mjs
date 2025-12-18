// Backfill deck stats (inkable, lore, strength, willpower, classifications) in Supabase without touching price/stock.
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE=... node scripts/backfill-deck-stats.mjs
//
// Behavior:
// - Fetches cards from Lorcana API
// - Skips promotional cards (same logic as import script)
// - Updates ONLY cards where stats are NULL (or missing)
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

function parseBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1'
  }
  if (typeof value === 'number') return value === 1
  return false
}

function parseInteger(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
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

  console.log("🔍 Fetching cards with NULL stats from Supabase...")
  // Paginate to avoid 1000 limit
  let page = 0
  const pageSize = 1000
  let hasMore = true
  const nullStatsIds = new Set()

  while (hasMore) {
    const from = page * pageSize
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from("cards")
      .select("id, inkable, lore, strength, willpower, classifications")
      .or("inkable.is.null,lore.is.null,strength.is.null,willpower.is.null,classifications.is.null")
      .range(from, to)

    if (error) throw error
    if (data?.length) {
      data.forEach((r) => {
        // Only include if at least one stat is NULL
        if (r.inkable === null || r.lore === null || r.strength === null || 
            r.willpower === null || r.classifications === null) {
          nullStatsIds.add(String(r.id))
        }
      })
    }
    hasMore = !!(data && data.length === pageSize)
    page++
    if (page >= 50) break
  }

  console.log(`✅ Found ${nullStatsIds.size} cards with NULL stats`)
  if (nullStatsIds.size === 0) {
    console.log("Nothing to backfill. Exiting.")
    return
  }

  // Build updates from API data (only for ids that exist and are null in DB)
  let skippedPromos = 0
  let candidates = 0
  const updates = []

  for (const c of lorcanaCards) {
    if (isPromotional(c)) {
      skippedPromos++
      continue
    }
    const id = toCardId(c)
    if (!nullStatsIds.has(id)) continue

    const update = { id }
    let hasUpdate = false

    // Parse stats (only include if not null in API)
    const inkable = c.Inkable !== undefined && c.Inkable !== null ? parseBoolean(c.Inkable) : null
    const lore = c.Lore !== undefined && c.Lore !== null ? parseInteger(c.Lore) : null
    const strength = c.Strength !== undefined && c.Strength !== null ? parseInteger(c.Strength) : null
    const willpower = c.Willpower !== undefined && c.Willpower !== null ? parseInteger(c.Willpower) : null
    const classifications = c.Classifications || null

    // Only include fields that have values
    if (inkable !== null) {
      update.inkable = inkable
      hasUpdate = true
    }
    if (lore !== null) {
      update.lore = lore
      hasUpdate = true
    }
    if (strength !== null) {
      update.strength = strength
      hasUpdate = true
    }
    if (willpower !== null) {
      update.willpower = willpower
      hasUpdate = true
    }
    if (classifications !== null) {
      update.classifications = classifications
      hasUpdate = true
    }

    if (hasUpdate) {
      candidates++
      updates.push(update)
    }
  }

  console.log(
    `📦 Candidates to update: ${updates.length} (skipped promos: ${skippedPromos})`
  )

  if (updates.length === 0) {
    console.log("No updates to apply. Exiting.")
    return
  }

  // Apply updates in chunks (Supabase has limits)
  // Use individual UPDATEs instead of upsert to avoid issues
  const chunkSize = 50
  let updated = 0
  let errors = 0

  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize)
    
    // Process each card individually with UPDATE
    for (const update of chunk) {
      const { id, ...statsToUpdate } = update
      
      // Only update fields that have values
      const updateObj = {}
      if (statsToUpdate.inkable !== undefined) updateObj.inkable = statsToUpdate.inkable
      if (statsToUpdate.lore !== undefined) updateObj.lore = statsToUpdate.lore
      if (statsToUpdate.strength !== undefined) updateObj.strength = statsToUpdate.strength
      if (statsToUpdate.willpower !== undefined) updateObj.willpower = statsToUpdate.willpower
      if (statsToUpdate.classifications !== undefined) updateObj.classifications = statsToUpdate.classifications

      if (Object.keys(updateObj).length === 0) continue

      const { error } = await supabase
        .from("cards")
        .update(updateObj)
        .eq("id", id)

      if (error) {
        errors++
        if (errors <= 5) { // Only log first 5 errors to avoid spam
          console.error(`Error updating card ${id}:`, error.message)
        }
      } else {
        updated++
      }
    }

    console.log(`✓ Processed chunk ${Math.floor(i / chunkSize) + 1}: ${updated} updated, ${errors} errors (${i + chunk.length}/${updates.length})`)

    // Small delay to avoid rate limits
    if (i + chunkSize < updates.length) {
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  console.log("\n✅ Backfill completed!")
  console.log(`   - Updated: ${updated} cards`)
  if (errors > 0) {
    console.log(`   - Errors: ${errors} cards`)
  }
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})


import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseSession } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

type DeckType = "aggro" | "midrange" | "control"
type CurveType = "low" | "balanced" | "high"

type GenerateRequest = {
  deckType: DeckType
  colors: string[] // max 2 (Amber, Amethyst, Emerald, Ruby, Sapphire, Steel)
  curve: CurveType
}

type DeckCard = {
  cardId: string
  name?: string
  qty: number
  inkCost?: number | null
  inkColor?: string | null
  type?: string
  reason?: string
}

function parseColors(inkColor: unknown): string[] {
  if (!inkColor) return []
  return String(inkColor)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

function isAllowedByColors(cardColors: string[], allowed: string[]) {
  if (allowed.length === 0) return true
  if (cardColors.length === 0) return false
  return cardColors.every((c) => allowed.includes(c))
}

function curveTargets(curve: CurveType) {
  // targets by cost bucket: 0-1, 2-3, 4-5, 6+
  if (curve === "low") return { b01: 10, b23: 28, b45: 18, b6p: 4 }
  if (curve === "high") return { b01: 4, b23: 16, b45: 24, b6p: 16 }
  return { b01: 6, b23: 22, b45: 22, b6p: 10 }
}

function bucket(cost: number | null | undefined) {
  const c = typeof cost === "number" ? cost : cost ? Number(cost) : null
  if (c === null || Number.isNaN(c)) return "b45" // neutral fallback
  if (c <= 1) return "b01"
  if (c <= 3) return "b23"
  if (c <= 5) return "b45"
  return "b6p"
}

function typeWeights(deckType: DeckType) {
  // very rough MVP distribution preference
  if (deckType === "aggro") return { character: 1.3, action: 1.0, item: 0.8, location: 0.7, song: 1.0 }
  if (deckType === "control") return { character: 1.0, action: 1.2, item: 1.0, location: 1.1, song: 1.1 }
  return { character: 1.15, action: 1.05, item: 0.95, location: 0.9, song: 1.0 }
}

function scoreCard(card: any, deckType: DeckType, curve: CurveType) {
  const tw = typeWeights(deckType)
  const t = String(card.type || "character")
  const cost = typeof card.inkCost === "number" ? card.inkCost : card.inkCost ? Number(card.inkCost) : null
  const b = bucket(cost)
  const ct = curveTargets(curve)

  // base: prefer having inkCost (better curve control)
  let score = cost === null || Number.isNaN(cost) ? 0.6 : 1.0
  score *= tw[t as keyof typeof tw] ?? 1.0

  // cost preference: aggro likes cheaper, control likes higher
  if (deckType === "aggro") {
    if (b === "b01") score *= 1.25
    if (b === "b23") score *= 1.15
    if (b === "b6p") score *= 0.85
  } else if (deckType === "control") {
    if (b === "b6p") score *= 1.2
    if (b === "b45") score *= 1.1
    if (b === "b01") score *= 0.9
  }

  // small nudge towards meeting curve (handled later by greedy fill)
  score *= 1 + (ct[b as keyof typeof ct] / 60) * 0.1

  return score
}

async function fetchOwnedPool(userId: string) {
  if (!supabaseAdmin) throw new Error("Supabase admin not configured")

  // Get owned quantities
  const { data: ownedRows, error: ownedErr } = await supabaseAdmin
    .from("user_collections")
    .select("card_id, quantity")
    .eq("user_id", userId)
    .eq("status", "owned")

  if (ownedErr) throw ownedErr

  const qtyById = new Map<string, number>()
  for (const r of ownedRows || []) {
    const id = String((r as any).card_id)
    const q = Number((r as any).quantity || 0)
    if (!id || q <= 0) continue
    qtyById.set(id, (qtyById.get(id) || 0) + q)
  }

  const ids = [...qtyById.keys()]
  if (ids.length === 0) return { qtyById, cardsById: new Map<string, any>() }

  const cardsById = new Map<string, any>()
  const chunkSize = 500
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize)
    const { data: cards, error: cardsErr } = await supabaseAdmin
      .from("cards")
      .select("id,name,type,set,rarity,inkCost,inkColor")
      .in("id", chunk)
      .eq("status", "approved")

    if (cardsErr) throw cardsErr
    for (const c of cards || []) cardsById.set(String((c as any).id), c)
  }

  return { qtyById, cardsById }
}

async function fetchMissingSuggestions(allowedColors: string[], excludeIds: Set<string>, limit = 30) {
  if (!supabaseAdmin) return []

  let query = supabaseAdmin
    .from("cards")
    .select("id,name,type,inkCost,inkColor,set,rarity")
    .eq("status", "approved")
    .limit(500)

  const { data, error } = await query
  if (error) return []

  const filtered = (data || []).filter((c: any) => {
    const id = String(c.id)
    if (excludeIds.has(id)) return false
    const colors = parseColors(c.inkColor)
    return isAllowedByColors(colors, allowedColors)
  })

  // prioritize by having inkCost and lower cost generally
  filtered.sort((a: any, b: any) => {
    const ac = typeof a.inkCost === "number" ? a.inkCost : 99
    const bc = typeof b.inkCost === "number" ? b.inkCost : 99
    return ac - bc
  })

  return filtered.slice(0, limit).map((c: any) => ({
    cardId: String(c.id),
    name: c.name,
    qty: 0,
    inkCost: c.inkCost ?? null,
    inkColor: c.inkColor ?? null,
    type: c.type,
    reason: "Sugerida (no la tienes en tu colección)",
  }))
}

function buildDeckFromPool(params: GenerateRequest, qtyById: Map<string, number>, cardsById: Map<string, any>) {
  const allowedColors = (params.colors || []).slice(0, 2)
  const maxCopies = 4
  const deckSize = 60

  // Create candidate list (only allowed colors)
  const candidates: any[] = []
  for (const [id, qty] of qtyById.entries()) {
    const card = cardsById.get(id)
    if (!card) continue
    const cardColors = parseColors(card.inkColor)
    if (!isAllowedByColors(cardColors, allowedColors)) continue
    candidates.push({ ...card, _id: id, _ownedQty: qty })
  }

  // sort by score (descending)
  candidates.sort((a, b) => scoreCard(b, params.deckType, params.curve) - scoreCard(a, params.deckType, params.curve))

  const targets = curveTargets(params.curve)
  const filled = { b01: 0, b23: 0, b45: 0, b6p: 0 }

  const deck: DeckCard[] = []
  let total = 0

  // greedy fill respecting curve buckets
  for (const c of candidates) {
    if (total >= deckSize) break
    const b = bucket(c.inkCost) as keyof typeof filled
    const bucketTarget = targets[b]
    const remainingBucketNeed = Math.max(0, bucketTarget - filled[b])

    const available = Math.min(maxCopies, Number(c._ownedQty || 0))
    if (available <= 0) continue

    // prefer filling needed buckets first, otherwise allow if still room
    let take = 0
    if (remainingBucketNeed > 0) take = Math.min(available, remainingBucketNeed, deckSize - total)
    else take = Math.min(Math.max(1, Math.floor(available / 2)), deckSize - total) // small sprinkle

    if (take <= 0) continue

    deck.push({
      cardId: String(c._id),
      name: c.name,
      qty: take,
      inkCost: c.inkCost ?? null,
      inkColor: c.inkColor ?? null,
      type: c.type,
      reason: "Seleccionada por sinergia básica y curva",
    })
    filled[b] += take
    total += take
  }

  // If still short, just fill from top candidates regardless of bucket
  if (total < deckSize) {
    for (const c of candidates) {
      if (total >= deckSize) break
      const existing = deck.find((d) => d.cardId === String(c._id))
      const already = existing?.qty || 0
      const available = Math.min(maxCopies, Number(c._ownedQty || 0))
      const remaining = available - already
      if (remaining <= 0) continue
      const take = Math.min(remaining, deckSize - total)
      if (take <= 0) continue
      if (existing) {
        existing.qty += take
      } else {
        deck.push({
          cardId: String(c._id),
          name: c.name,
          qty: take,
          inkCost: c.inkCost ?? null,
          inkColor: c.inkColor ?? null,
          type: c.type,
          reason: "Relleno para completar 60 cartas",
        })
      }
      total += take
    }
  }

  return { deck, total, curveFilled: filled, allowedColors }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySupabaseSession(request)
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const body = (await request.json()) as Partial<GenerateRequest>
    const deckType = (body.deckType || "midrange") as DeckType
    const curve = (body.curve || "balanced") as CurveType
    const colors = Array.isArray(body.colors) ? body.colors.map(String) : []
    const params: GenerateRequest = { deckType, curve, colors: colors.slice(0, 2) }

    const { qtyById, cardsById } = await fetchOwnedPool(auth.userId)
    const { deck, total, curveFilled, allowedColors } = buildDeckFromPool(params, qtyById, cardsById)

    const ownedIds = new Set<string>([...qtyById.keys()])
    const missing = total < 60 ? await fetchMissingSuggestions(allowedColors, ownedIds, 40) : []

    return NextResponse.json({
      success: true,
      data: {
        params,
        deck,
        meta: {
          deckSize: 60,
          totalSelected: total,
          maxCopies: 4,
          curveFilled,
        },
        missingSuggestions: missing,
      },
    })
  } catch (error) {
    console.error("Error in POST /api/decks/generate:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}



import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseSession } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

type DeckType = "aggro" | "midrange" | "control" | "combo"
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
  // PRO: More low-cost cards for better early game
  if (curve === "low") return { b01: 12, b23: 30, b45: 15, b6p: 3 }  // 42 low-cost (70%)
  if (curve === "high") return { b01: 6, b23: 18, b45: 22, b6p: 14 } // 24 low-cost (40%)
  return { b01: 8, b23: 26, b45: 20, b6p: 6 } // 34 low-cost (57%) - balanced but still aggro-friendly
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
  if (deckType === "combo") return { character: 1.1, action: 1.15, item: 1.0, location: 0.9, song: 1.2 }
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

  // Inkable bonus: CRITICAL for deck consistency (PRO requirement: 65-70% inkable)
  const inkable = card.inkable === true || card.inkable === "true" || card.inkable === 1
  if (inkable) {
    score *= 1.4 // VERY strong preference for inkable cards (was 1.15)
  } else if (card.inkable === false || card.inkable === "false" || card.inkable === 0) {
    score *= 0.5 // Strong penalty for non-inkable (was 0.75)
  }

  // Stats-based scoring (only for characters)
  if (t === "character") {
    const strength = typeof card.strength === "number" ? card.strength : card.strength ? Number(card.strength) : null
    const willpower = typeof card.willpower === "number" ? card.willpower : card.willpower ? Number(card.willpower) : null
    const lore = typeof card.lore === "number" ? card.lore : card.lore ? Number(card.lore) : null

    // Aggro: prioritize good stats-to-cost ratio, early lore pressure
    if (deckType === "aggro") {
      if (cost !== null && strength !== null && willpower !== null && cost > 0) {
        const statValue = (strength + willpower) / cost
        score *= 1 + (statValue / 10) * 0.3 // Bonus for efficient stat-to-cost ratio
      }
      if (lore !== null && lore > 0) {
        score *= 1 + (lore / 10) * 0.2 // Aggro wants lore early
      }
      // Penalize high-cost characters in aggro (unless they're very efficient)
      if (cost !== null && cost >= 6 && (strength === null || strength < 5)) {
        score *= 0.7
      }
    }

    // Control: prioritize high willpower (survivability) and good top-end
    if (deckType === "control") {
      if (willpower !== null && willpower >= 5) {
        score *= 1.2 // Control needs durable bodies
      }
      if (cost !== null && cost >= 6 && willpower !== null && willpower >= 4) {
        score *= 1.15 // Good top-end finishers
      }
    }

    // Midrange: balanced approach, prefer efficient mid-cost characters
    if (deckType === "midrange") {
      if (cost !== null && cost >= 4 && cost <= 5) {
        if (strength !== null && willpower !== null && strength + willpower >= 8) {
          score *= 1.1
        }
      }
    }

    // Combo: prioritize cards that enable synergies (songs, specific characters, actions)
    if (deckType === "combo") {
      // Prefer songs (combo enablers)
      if (t === "song") {
        score *= 1.25
      }
      // Prefer characters with lore abilities or synergies
      if (t === "character" && lore !== null && lore > 0) {
        score *= 1.1
      }
      // Prefer actions that interact with other cards
      if (t === "action") {
        score *= 1.15
      }
    }
  }

  // Lore value: all decks benefit from lore, but aggro prioritizes it more
  if (t === "character" && card.lore !== null && typeof card.lore === "number") {
    const loreMultiplier = deckType === "aggro" ? 0.15 : deckType === "control" ? 0.1 : deckType === "combo" ? 0.13 : 0.12
    score *= 1 + (card.lore / 5) * loreMultiplier
  }

  // cost preference: aggro likes cheaper, control likes higher, combo likes mid-range for setup
  if (deckType === "aggro") {
    if (b === "b01") score *= 1.25
    if (b === "b23") score *= 1.15
    if (b === "b6p") score *= 0.85
  } else if (deckType === "control") {
    if (b === "b6p") score *= 1.2
    if (b === "b45") score *= 1.1
    if (b === "b01") score *= 0.9
  } else if (deckType === "combo") {
    // Combo decks need setup cards (mid-cost) and some finishers
    if (b === "b23") score *= 1.1
    if (b === "b45") score *= 1.15
    if (b === "b01") score *= 1.05 // Some cheap enablers
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
      .select("id,name,type,set,rarity,inkCost,inkable,lore,strength,willpower,classifications,inkColor")
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
    .select("id,name,type,inkCost,inkable,lore,strength,willpower,classifications,inkColor,set,rarity")
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
  const candidatesByType: Record<string, any[]> = { character: [], action: [], song: [], item: [], location: [] }
  
  for (const [id, qty] of qtyById.entries()) {
    const card = cardsById.get(id)
    if (!card) continue
    const cardColors = parseColors(card.inkColor)
    if (!isAllowedByColors(cardColors, allowedColors)) continue
    const candidate = { ...card, _id: id, _ownedQty: qty }
    candidates.push(candidate)
    const cardType = String(card.type || "character")
    if (candidatesByType[cardType]) {
      candidatesByType[cardType].push(candidate)
    }
  }

  // Sort all candidates by score
  candidates.sort((a, b) => scoreCard(b, params.deckType, params.curve) - scoreCard(a, params.deckType, params.curve))
  
  // Sort each type separately for diversity picking
  for (const type in candidatesByType) {
    candidatesByType[type].sort((a, b) => scoreCard(b, params.deckType, params.curve) - scoreCard(a, params.deckType, params.curve))
  }

  const targets = curveTargets(params.curve)
  const filled = { b01: 0, b23: 0, b45: 0, b6p: 0 }
  
  // Type distribution targets (PRO balance) - adjusted by deck type
  let typeTargets: Record<string, number>
  if (params.deckType === "aggro") {
    typeTargets = {
      character: 38,  // ~63% characters (aggro needs bodies)
      action: 12,     // ~20% actions (removal/interaction)
      song: 6,        // ~10% songs (synergy)
      item: 3,        // ~5% items
      location: 1,    // ~2% locations (optional)
    }
  } else if (params.deckType === "control") {
    typeTargets = {
      character: 32,  // ~53% characters
      action: 15,     // ~25% actions (removal/control spells)
      song: 8,        // ~13% songs
      item: 4,        // ~7% items
      location: 1,    // ~2% locations
    }
  } else if (params.deckType === "combo") {
    typeTargets = {
      character: 34,  // ~57% characters (combo pieces)
      action: 10,     // ~17% actions
      song: 12,       // ~20% songs (combo enablers)
      item: 3,        // ~5% items
      location: 1,    // ~2% locations
    }
  } else {
    // midrange - balanced
    typeTargets = {
      character: 35,  // ~58% characters
      action: 10,     // ~17% actions
      song: 8,        // ~13% songs
      item: 5,        // ~8% items
      location: 2,    // ~3% locations
    }
  }
  const typeFilled: Record<string, number> = { character: 0, action: 0, song: 0, item: 0, location: 0 }

  const deck: DeckCard[] = []
  let total = 0

  // Helper: check if we need more of this type
  const needsType = (cardType: string): number => {
    const type = cardType || "character"
    const target = typeTargets[type] || 0
    const current = typeFilled[type] || 0
    return Math.max(0, target - current)
  }

  // Helper: check if we need more of this cost bucket
  const needsBucket = (b: keyof typeof filled): number => {
    const target = targets[b]
    const current = filled[b]
    return Math.max(0, target - current)
  }

  // Helper: add card to deck
  const addCardToDeck = (c: any, take: number, reason: string) => {
    const b = bucket(c.inkCost) as keyof typeof filled
    const cardType = String(c.type || "character")
    const existing = deck.find((d) => d.cardId === String(c._id))
    
    if (existing) {
      existing.qty += take
    } else {
      deck.push({
        cardId: String(c._id),
        name: c.name,
        qty: take,
        inkCost: c.inkCost ?? null,
        inkColor: c.inkColor ?? null,
        type: cardType,
        reason,
      })
    }
    filled[b] += take
    typeFilled[cardType] = (typeFilled[cardType] || 0) + take
  }

  // Phase 1: PRO BUILD - Characters FIRST (they're the core of any deck)
  // Ensure we get enough characters before adding other types
  const characterTarget = typeTargets.character || 35
  const characterCandidates = candidatesByType.character || []
  let charactersAdded = 0
  
  // First, add characters up to target (prioritize inkables)
  for (const c of characterCandidates) {
    if (total >= deckSize) break
    if (charactersAdded >= characterTarget) break
    
    // Strongly prefer inkable characters
    const isInkable = c.inkable === true || c.inkable === "true" || c.inkable === 1
    if (!isInkable && charactersAdded < characterTarget * 0.7) {
      // Skip non-inkable if we haven't met 70% of character target (prioritize inkables)
      continue
    }
    
    const available = Math.min(maxCopies, Number(c._ownedQty || 0))
    if (available <= 0) continue
    
    const existing = deck.find((d) => d.cardId === String(c._id))
    const already = existing?.qty || 0
    const canAdd = Math.min(available - already, maxCopies - already)
    if (canAdd <= 0) continue
    
    const b = bucket(c.inkCost) as keyof typeof filled
    const bucketNeed = needsBucket(b)
    const stillNeeded = characterTarget - charactersAdded
    
    // Take cards that help with curve and character count
    let take = 0
    if (bucketNeed > 0) {
      take = Math.min(canAdd, stillNeeded, bucketNeed, deckSize - total)
    } else {
      take = Math.min(canAdd, stillNeeded, deckSize - total)
    }
    
    if (take > 0) {
      addCardToDeck(c, take, "Prioridad: Personajes (base del mazo)")
      charactersAdded += take
      total += take
    }
  }
  
  // Phase 1.5: Add diversity (actions, songs, items) - but ensure inkables
  for (const targetType of Object.keys(typeTargets)) {
    if (targetType === "character") continue // Already handled
    if (total >= deckSize) break
    
    const target = typeTargets[targetType]
    if (target <= 0) continue
    const current = typeFilled[targetType] || 0
    const needed = Math.max(0, target - current)
    
    if (needed <= 0) continue
    const typeCandidates = candidatesByType[targetType] || []
    
    // Get the best cards of this type (prioritize inkables)
    for (const c of typeCandidates) {
      if (total >= deckSize) break
      if (needed <= 0) break
      
      // Prefer inkable cards for diversity types too
      const isInkable = c.inkable === true || c.inkable === "true" || c.inkable === 1
      if (!isInkable && current < target * 0.5) {
        // If we're still building the type base, skip non-inkables
        continue
      }
      
      const available = Math.min(maxCopies, Number(c._ownedQty || 0))
      if (available <= 0) continue
      
      const existing = deck.find((d) => d.cardId === String(c._id))
      const already = existing?.qty || 0
      const canAdd = Math.min(available - already, maxCopies - already)
      if (canAdd <= 0) continue
      
      const b = bucket(c.inkCost) as keyof typeof filled
      const bucketNeed = needsBucket(b)
      
      let take = 0
      if (bucketNeed > 0) {
        take = Math.min(canAdd, needed, bucketNeed, deckSize - total)
      } else {
        take = Math.min(canAdd, needed, deckSize - total)
      }
      
      if (take > 0) {
        addCardToDeck(c, take, `Diversidad: ${targetType}`)
        total += take
      }
    }
  }

  // Phase 2: Fill remaining slots - prioritize inkables heavily
  // Calculate current inkable percentage to maintain 65-70% target
  let currentInkableCount = 0
  for (const d of deck) {
    const card = cardsById.get(d.cardId)
    if (!card) continue
    const isInkable = card.inkable === true || card.inkable === "true" || card.inkable === 1
    if (isInkable) currentInkableCount += d.qty
  }
  const targetInkableCount = Math.floor(deckSize * 0.67) // 67% target (between 65-70%)
  const inkableStillNeeded = Math.max(0, targetInkableCount - currentInkableCount)
  
  for (const c of candidates) {
    if (total >= deckSize) break
    const b = bucket(c.inkCost) as keyof typeof filled
    const cardType = String(c.type || "character")
    const isInkable = c.inkable === true || c.inkable === "true" || c.inkable === 1
    
    const bucketNeed = needsBucket(b)
    const typeNeed = needsType(cardType)
    
    // If we're below inkable target, strongly prefer inkable cards
    if (!isInkable && inkableStillNeeded > (deckSize - total) * 0.5) {
      // Skip non-inkable if we need more inkables
      continue
    }
    
    const available = Math.min(maxCopies, Number(c._ownedQty || 0))
    if (available <= 0) continue

    const existing = deck.find((d) => d.cardId === String(c._id))
    const already = existing?.qty || 0
    const canAdd = Math.min(available - already, maxCopies - already)
    if (canAdd <= 0) continue

    // Prioritize cards that fill curve, type, AND are inkable
    let take = 0
    if (bucketNeed > 0 && typeNeed > 0) {
      take = Math.min(canAdd, bucketNeed, typeNeed, deckSize - total)
    } else if (typeNeed > 0) {
      take = Math.min(canAdd, typeNeed, deckSize - total)
    } else if (bucketNeed > 0) {
      take = Math.min(canAdd, bucketNeed, deckSize - total)
    } else {
      // Both quotas met - only add if it's inkable and we need more
      if (isInkable && currentInkableCount < targetInkableCount) {
        take = Math.min(canAdd, deckSize - total)
      } else if (total < deckSize - 3) {
        take = Math.min(1, canAdd, deckSize - total) // Minimal filler
      }
    }

    if (take <= 0) continue
    
    addCardToDeck(c, take, "Balanceado: curva, tipos e inkables")
    if (isInkable) currentInkableCount += take
    total += take
  }

  // Phase 3: Final fill if still short - prioritize inkables and type balance
  if (total < deckSize) {
    // Recalculate inkable count
    let finalInkableCount = 0
    for (const d of deck) {
      const card = cardsById.get(d.cardId)
      if (!card) continue
      const isInkable = card.inkable === true || card.inkable === "true" || card.inkable === 1
      if (isInkable) finalInkableCount += d.qty
    }
    const finalTargetInkable = Math.floor(deckSize * 0.67)
    const finalInkableNeeded = Math.max(0, finalTargetInkable - finalInkableCount)
    
    // First priority: Fill missing types with inkables
    for (const targetType of Object.keys(typeTargets)) {
      if (total >= deckSize) break
      const needed = needsType(targetType)
      if (needed <= 0) continue
      
      const typeCandidates = candidatesByType[targetType] || []
      for (const c of typeCandidates) {
        if (total >= deckSize) break
        if (needed <= 0) break
        
        const isInkable = c.inkable === true || c.inkable === "true" || c.inkable === 1
        // Prefer inkables if we still need them
        if (!isInkable && finalInkableNeeded > 0) continue
        
        const available = Math.min(maxCopies, Number(c._ownedQty || 0))
        const existing = deck.find((d) => d.cardId === String(c._id))
        const already = existing?.qty || 0
        const remaining = available - already
        if (remaining <= 0) continue
        
        const take = Math.min(remaining, needed, deckSize - total)
        if (take > 0) {
          addCardToDeck(c, take, "Relleno: tipos balanceados")
          if (isInkable) finalInkableCount += take
          total += take
        }
      }
    }
    
    // Finally, fill any remaining slots - ONLY inkables if we're below target
    if (total < deckSize) {
      for (const c of candidates) {
        if (total >= deckSize) break
        const isInkable = c.inkable === true || c.inkable === "true" || c.inkable === 1
        
        // If we need more inkables, only add inkable cards
        if (!isInkable && finalInkableCount < finalTargetInkable) continue
        
        const existing = deck.find((d) => d.cardId === String(c._id))
        const already = existing?.qty || 0
        const available = Math.min(maxCopies, Number(c._ownedQty || 0))
        const remaining = available - already
        if (remaining <= 0) continue
        
        const take = Math.min(remaining, deckSize - total)
        if (take > 0) {
          addCardToDeck(c, take, "Relleno final: completar 60 cartas")
          if (isInkable) finalInkableCount += take
          total += take
        }
      }
    }
  }

  // Calculate deck stats
  let inkableCount = 0
  let totalLore = 0
  const typeCounts: Record<string, number> = {}

  for (const d of deck) {
    const card = cardsById.get(d.cardId)
    if (!card) continue
    const isInkable = card.inkable === true || card.inkable === "true" || card.inkable === 1
    if (isInkable) inkableCount += d.qty
    if (typeof card.lore === "number") totalLore += card.lore * d.qty
    typeCounts[card.type || "unknown"] = (typeCounts[card.type || "unknown"] || 0) + d.qty
  }

  return { 
    deck, 
    total, 
    curveFilled: filled, 
    allowedColors,
    stats: {
      inkableCount,
      inkablePercentage: total > 0 ? Math.round((inkableCount / total) * 100) : 0,
      totalLore,
      typeDistribution: typeCounts,
    }
  }
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
    const { deck, total, curveFilled, allowedColors, stats } = buildDeckFromPool(params, qtyById, cardsById)

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
          stats,
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



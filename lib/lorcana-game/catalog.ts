import type { Card } from "@/lib/types"
import type { GameCardDefinition, GameCardType } from "./types"
import { clampInkCost } from "./utils"

const TYPE_MAP: Record<string, GameCardType> = {
  character: "character",
  action: "action",
  item: "item",
  location: "location",
  song: "song",
}

export function cardToDefinition(card: Card): GameCardDefinition {
  const t = TYPE_MAP[card.type] ?? "character"
  const inkColor =
    typeof card.inkColor === "string" ? card.inkColor.trim() || null : card.inkColor ?? null

  return {
    id: String(card.id).toLowerCase().trim(),
    name: card.name,
    type: t,
    inkCost: clampInkCost(card.inkCost),
    inkable: card.inkable !== false,
    inkColor,
    lore: typeof card.lore === "number" ? card.lore : null,
    strength: typeof card.strength === "number" ? card.strength : null,
    willpower: typeof card.willpower === "number" ? card.willpower : null,
  }
}

export function buildDefinitionMap(cards: Card[]): Map<string, GameCardDefinition> {
  const m = new Map<string, GameCardDefinition>()
  for (const c of cards) {
    m.set(String(c.id).toLowerCase().trim(), cardToDefinition(c))
  }
  return m
}

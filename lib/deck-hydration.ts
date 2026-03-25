import type { Card as CardType } from "@/lib/types"

/** Fila mínima desde API / base (sin objeto carta completo) */
export interface DeckCardRow {
  cardId: string
  quantity: number
}

export interface DeckRow {
  id: string
  name: string
  cards: DeckCardRow[]
  createdAt: string
  updatedAt: string
}

export interface HydratedDeckCard {
  cardId: string
  card: CardType
  quantity: number
}

export interface HydratedSavedDeck {
  id: string
  name: string
  cards: HydratedDeckCard[]
  createdAt: string
  updatedAt: string
}

/** Alias para UI (mazo con cartas resueltas desde catálogo) */
export type SavedDeck = HydratedSavedDeck
export type DeckCard = HydratedDeckCard

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim())
}

export function isServerDeckId(id: string): boolean {
  return isUuid(id)
}

/** Carta mínima cuando el catálogo aún no tiene el id (colección / API). */
export function placeholderCard(cardId: string): CardType {
  return {
    id: cardId,
    name: `Carta (${cardId})`,
    image: "/placeholder.svg",
    price: 0,
    foilPrice: 0,
    productType: "card",
    set: "unknown",
    rarity: "common",
    type: "character",
    number: 0,
  }
}

export function buildCardLookup(cards: CardType[]): Map<string, CardType> {
  const m = new Map<string, CardType>()
  for (const c of cards) {
    m.set(String(c.id).toLowerCase().trim(), c)
  }
  return m
}

export function hydrateDeckRows(
  rows: DeckRow[],
  cardLookup: Map<string, CardType>
): HydratedSavedDeck[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    cards: row.cards.map(({ cardId, quantity }) => {
      const key = cardId.toLowerCase().trim()
      const card = cardLookup.get(key) ?? placeholderCard(cardId)
      return { cardId, quantity, card }
    }),
  }))
}

/** Convierte el mazo en curso a payload para guardar (solo ids y cantidades). */
export function toDeckCardRows(
  cards: { cardId: string; quantity: number }[]
): DeckCardRow[] {
  const out: DeckCardRow[] = []
  for (const c of cards) {
    const cardId = String(c.cardId).trim()
    const q = Math.floor(Number(c.quantity) || 0)
    if (!cardId || q < 1) continue
    out.push({ cardId, quantity: Math.min(4, q) })
  }
  return out
}

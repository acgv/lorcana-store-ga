import { describe, expect, it } from "vitest"
import { applyAction, startGame } from "./engine"
import type { GameCardDefinition } from "./types"

function def(overrides: Partial<GameCardDefinition> & Pick<GameCardDefinition, "id" | "name" | "type">): GameCardDefinition {
  return {
    inkCost: 0,
    inkable: true,
    inkColor: "Amber",
    lore: null,
    strength: null,
    willpower: null,
    ...overrides,
  }
}

describe("lorcana-game engine", () => {
  it("reparte mano inicial y el jugador inicial omite la primera robada", () => {
    // En Lorcana el límite es 4 copias por carta; armamos un mazo mínimo de 8 cartas.
    const map = new Map<string, GameCardDefinition>([
      ["c1", def({ id: "c1", name: "Inkable A", type: "character", inkCost: 1, lore: 1 })],
      ["c2", def({ id: "c2", name: "Inkable B", type: "character", inkCost: 1, lore: 1 })],
    ])
    const deck = [
      { cardId: "c1", quantity: 4 },
      { cardId: "c2", quantity: 4 },
    ]
    const rng = () => 0.5
    const started = startGame({ definitions: map, deck0: deck, deck1: deck, rng })
    expect(started.ok).toBe(true)
    if (!started.ok) return
    expect(started.state.players[0].hand.length).toBe(7)
    expect(started.state.players[1].hand.length).toBe(7)
    const drawEv = started.events.find((e) => e.type === "DRAW")
    expect(drawEv?.type === "DRAW" && drawEv.skippedFirst).toBe(true)
  })

  it("permite jugar ubicación 0 coste, hacer quest y sumar lore", () => {
    const map = new Map<string, GameCardDefinition>([
      [
        "loc1",
        def({
          id: "loc1",
          name: "Location",
          type: "location",
          inkCost: 0,
          lore: 2,
          inkable: true,
        }),
      ],
    ])
    const deck = [{ cardId: "loc1", quantity: 60 }]
    const started = startGame({ definitions: map, deck0: deck, deck1: deck, loreToWin: 20, rng: () => 0.3 })
    expect(started.ok).toBe(true)
    if (!started.ok) return
    let s = started.state

    const skipInk = applyAction(s, { type: "SKIP_INK" })
    expect(skipInk.ok).toBe(true)
    if (!skipInk.ok) return
    s = skipInk.state

    const play = applyAction(s, { type: "PLAY_FROM_HAND", handIndex: 0 })
    expect(play.ok).toBe(true)
    if (!play.ok) return
    s = play.state
    expect(s.players[0].inPlay.length).toBe(1)

    const quest = applyAction(s, { type: "QUEST", inPlayIndex: 0 })
    expect(quest.ok).toBe(true)
    if (!quest.ok) return
    expect(quest.state.players[0].lore).toBe(2)
    expect(quest.events.some((e) => e.type === "QUEST_LORE")).toBe(true)
  })

  it("bloquea quest mientras la carta seca (personaje)", () => {
    const map = new Map<string, GameCardDefinition>([
      ["ch1", def({ id: "ch1", name: "Hero", type: "character", inkCost: 0, lore: 2 })],
    ])
    const deck = [{ cardId: "ch1", quantity: 60 }]
    const started = startGame({ definitions: map, deck0: deck, deck1: deck, rng: () => 0.4 })
    expect(started.ok).toBe(true)
    if (!started.ok) return
    const skip = applyAction(started.state, { type: "SKIP_INK" })
    expect(skip.ok).toBe(true)
    if (!skip.ok) return
    let s = skip.state
    const play = applyAction(s, { type: "PLAY_FROM_HAND", handIndex: 0 })
    expect(play.ok).toBe(true)
    if (!play.ok) return
    s = play.state
    const bad = applyAction(s, { type: "QUEST", inPlayIndex: 0 })
    expect(bad.ok).toBe(false)
    if (bad.ok) return
    expect(bad.error).toMatch(/secando/i)
  })

  it("resuelve challenge entre personajes y manda al descarte al derrotado", () => {
    const map = new Map<string, GameCardDefinition>([
      [
        "a1",
        def({
          id: "a1",
          name: "Attacker",
          type: "character",
          inkCost: 0,
          lore: 1,
          strength: 3,
          willpower: 2,
        }),
      ],
      [
        "d1",
        def({
          id: "d1",
          name: "Defender",
          type: "character",
          inkCost: 0,
          lore: 1,
          strength: 1,
          willpower: 2,
        }),
      ],
    ])
    const started = startGame({
      definitions: map,
      deck0: [{ cardId: "a1", quantity: 60 }],
      deck1: [{ cardId: "d1", quantity: 60 }],
      rng: () => 0.2,
    })
    expect(started.ok).toBe(true)
    if (!started.ok) return

    // p0: ir a main y jugar atacante
    let s = started.state
    const p0Skip = applyAction(s, { type: "SKIP_INK" })
    expect(p0Skip.ok).toBe(true)
    if (!p0Skip.ok) return
    s = p0Skip.state
    const p0Play = applyAction(s, { type: "PLAY_FROM_HAND", handIndex: 0 })
    expect(p0Play.ok).toBe(true)
    if (!p0Play.ok) return
    s = p0Play.state
    const p0End = applyAction(s, { type: "END_MAIN" })
    expect(p0End.ok).toBe(true)
    if (!p0End.ok) return
    s = p0End.state

    // p1: ir a main y jugar defensor
    const p1Skip = applyAction(s, { type: "SKIP_INK" })
    expect(p1Skip.ok).toBe(true)
    if (!p1Skip.ok) return
    s = p1Skip.state
    const p1Play = applyAction(s, { type: "PLAY_FROM_HAND", handIndex: 0 })
    expect(p1Play.ok).toBe(true)
    if (!p1Play.ok) return
    s = p1Play.state
    const p1End = applyAction(s, { type: "END_MAIN" })
    expect(p1End.ok).toBe(true)
    if (!p1End.ok) return
    s = p1End.state

    // En test forzamos al defensor a exerted para habilitar challenge legal.
    s.players[1].inPlay[0].ready = false

    // El motor entra al siguiente turno en fase ink; avanzamos a main.
    const p0SkipInk = applyAction(s, { type: "SKIP_INK" })
    expect(p0SkipInk.ok).toBe(true)
    if (!p0SkipInk.ok) return
    s = p0SkipInk.state

    const challenge = applyAction(s, { type: "CHALLENGE", attackerIndex: 0, defenderIndex: 0 })
    expect(challenge.ok).toBe(true)
    if (!challenge.ok) return
    expect(challenge.events.some((e) => e.type === "CHALLENGED")).toBe(true)
    expect(challenge.events.some((e) => e.type === "CARD_BANISHED")).toBe(true)
    expect(challenge.state.players[1].inPlay.length).toBe(0)
    expect(challenge.state.players[1].discard.length).toBeGreaterThan(0)
  })
})

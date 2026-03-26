import type {
  ApplyResult,
  CardInstance,
  GameAction,
  GameCardDefinition,
  GameEvent,
  GameState,
  InPlayCard,
  PlayerZone,
} from "./types"
import { newInstanceId, shuffle } from "./utils"

const OPENING_HAND = 7

export interface StartGameInput {
  definitions: ReadonlyMap<string, GameCardDefinition>
  /** Mazo del jugador 0: ids de definición + copias. */
  deck0: { cardId: string; quantity: number }[]
  deck1: { cardId: string; quantity: number }[]
  firstPlayer?: 0 | 1
  loreToWin?: number
  /** Para tests reproducibles. */
  rng?: () => number
}

function emptyPlayer(): PlayerZone {
  return {
    deck: [],
    hand: [],
    discard: [],
    inkwell: [],
    inPlay: [],
    lore: 0,
  }
}

function expandDeck(
  rows: { cardId: string; quantity: number }[],
  definitions: ReadonlyMap<string, GameCardDefinition>,
  instances: Map<string, CardInstance>,
  rng: () => number
): string[] {
  const pool: string[] = []
  for (const row of rows) {
    const id = String(row.cardId).toLowerCase().trim()
    const def = definitions.get(id)
    if (!def) continue
    const qRaw = Math.floor(Number(row.quantity) || 0)
    if (qRaw < 1) continue
    const q = Math.min(4, qRaw)
    for (let i = 0; i < q; i++) {
      const instId = newInstanceId()
      instances.set(instId, { id: instId, definitionId: id })
      pool.push(instId)
    }
  }
  return shuffle(pool, rng)
}

function dealOpening(
  deck: string[],
  hand: string[],
  n: number
): { deck: string[]; hand: string[] } {
  let d = [...deck]
  let h = [...hand]
  for (let i = 0; i < n && d.length > 0; i++) {
    h.push(d.pop()!)
  }
  return { deck: d, hand: h }
}

function cloneState(s: GameState): GameState {
  return {
    definitions: s.definitions,
    instances: s.instances,
    players: [
      {
        deck: [...s.players[0].deck],
        hand: [...s.players[0].hand],
        discard: [...s.players[0].discard],
        inkwell: s.players[0].inkwell.map((x) => ({ ...x })),
        inPlay: s.players[0].inPlay.map((x) => ({ ...x })),
        lore: s.players[0].lore,
      },
      {
        deck: [...s.players[1].deck],
        hand: [...s.players[1].hand],
        discard: [...s.players[1].discard],
        inkwell: s.players[1].inkwell.map((x) => ({ ...x })),
        inPlay: s.players[1].inPlay.map((x) => ({ ...x })),
        lore: s.players[1].lore,
      },
    ],
    activePlayer: s.activePlayer,
    firstPlayer: s.firstPlayer,
    phase: s.phase,
    totalTurnsCompleted: s.totalTurnsCompleted,
    pendingSkipFirstDraw: s.pendingSkipFirstDraw,
    inkedThisTurn: s.inkedThisTurn,
    winner: s.winner,
    loreToWin: s.loreToWin,
  }
}

function getDef(state: GameState, definitionId: string): GameCardDefinition | undefined {
  return state.definitions.get(definitionId)
}

function readyActiveInkAndCharacters(p: PlayerZone): PlayerZone {
  const inkwell = p.inkwell.map((c) => ({ ...c, exerted: false }))
  const inPlay = p.inPlay.map((c) => ({
    ...c,
    ready: true,
    drying: false,
  }))
  return { ...p, inkwell, inPlay }
}

/**
 * Inicio de turno del jugador activo: preparar cartas, robar 1 (salvo primera robada del jugador inicial).
 */
export function runBeginPhase(state: GameState): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = []
  const s = cloneState(state)
  const ap = s.activePlayer
  events.push({ type: "TURN_BEGIN", player: ap })

  let p = readyActiveInkAndCharacters(s.players[ap])

  const skipDraw = s.pendingSkipFirstDraw && ap === s.firstPlayer
  let drawnId: string | null = null
  if (skipDraw) {
    s.pendingSkipFirstDraw = false
    events.push({ type: "DRAW", player: ap, instanceId: null, skippedFirst: true })
  } else if (p.deck.length > 0) {
    drawnId = p.deck.pop()!
    p.hand.push(drawnId)
    events.push({ type: "DRAW", player: ap, instanceId: drawnId, skippedFirst: false })
  } else {
    events.push({ type: "DRAW", player: ap, instanceId: null, skippedFirst: false })
  }

  s.players[ap] = p
  s.phase = "ink"
  s.inkedThisTurn = false

  return { state: s, events }
}

export function startGame(input: StartGameInput): ApplyResult {
  const rng = input.rng ?? Math.random
  const instances = new Map<string, CardInstance>()
  const defs = input.definitions

  const d0 = expandDeck(input.deck0, defs, instances, rng)
  const d1 = expandDeck(input.deck1, defs, instances, rng)

  if (d0.length === 0 || d1.length === 0) {
    return { ok: false, error: "Cada jugador necesita un mazo con al menos una carta conocida." }
  }

  const dealt0 = dealOpening(d0, [], OPENING_HAND)
  const dealt1 = dealOpening(d1, [], OPENING_HAND)

  const firstPlayer = input.firstPlayer ?? 0
  const loreToWin = input.loreToWin ?? 20

  let state: GameState = {
    definitions: defs,
    instances: instances,
    players: [
      {
        ...emptyPlayer(),
        deck: dealt0.deck,
        hand: dealt0.hand,
      },
      {
        ...emptyPlayer(),
        deck: dealt1.deck,
        hand: dealt1.hand,
      },
    ],
    activePlayer: firstPlayer,
    firstPlayer,
    phase: "begin",
    totalTurnsCompleted: 0,
    pendingSkipFirstDraw: true,
    inkedThisTurn: false,
    winner: null,
    loreToWin,
  }

  const begun = runBeginPhase(state)
  return { ok: true, state: begun.state, events: begun.events }
}

function countReadyInk(p: PlayerZone): number {
  return p.inkwell.filter((i) => !i.exerted).length
}

function exertInkForCost(p: PlayerZone, cost: number): PlayerZone | null {
  if (cost <= 0) return p
  const ready = p.inkwell.map((c, idx) => ({ c, idx })).filter((x) => !x.c.exerted)
  if (ready.length < cost) return null
  const inkwell = p.inkwell.map((c) => ({ ...c }))
  for (let i = 0; i < cost; i++) {
    inkwell[ready[i].idx].exerted = true
  }
  return { ...p, inkwell }
}

function removeHandCard(p: PlayerZone, handIndex: number): { zone: PlayerZone; instanceId: string } | null {
  if (handIndex < 0 || handIndex >= p.hand.length) return null
  const instanceId = p.hand[handIndex]
  const hand = p.hand.filter((_, i) => i !== handIndex)
  return { zone: { ...p, hand }, instanceId }
}

function pushDiscard(p: PlayerZone, instanceId: string): PlayerZone {
  return { ...p, discard: [...p.discard, instanceId] }
}

function removeInPlayCard(
  p: PlayerZone,
  inPlayIndex: number
): { zone: PlayerZone; card: InPlayCard } | null {
  if (inPlayIndex < 0 || inPlayIndex >= p.inPlay.length) return null
  const card = p.inPlay[inPlayIndex]
  const inPlay = p.inPlay.filter((_, i) => i !== inPlayIndex)
  return { zone: { ...p, inPlay }, card }
}

function applyPlay(
  state: GameState,
  handIndex: number
): { state: GameState; events: GameEvent[] } | { error: string } {
  const s = cloneState(state)
  const ap = s.activePlayer
  const p = s.players[ap]
  const removed = removeHandCard(p, handIndex)
  if (!removed) return { error: "Índice de mano inválido." }

  const inst = s.instances.get(removed.instanceId)
  if (!inst) return { error: "Instancia de carta desconocida." }

  const def = getDef(s, inst.definitionId)
  if (!def) return { error: "Definición de carta desconocida." }

  const cost = def.inkCost
  if (countReadyInk(removed.zone) < cost) {
    return { error: `Falta tinta: necesitas ${cost} y tienes ${countReadyInk(removed.zone)} lista(s).` }
  }

  const paid = exertInkForCost(removed.zone, cost)
  if (!paid) return { error: "No se pudo pagar el coste de tinta." }

  let next = paid
  const events: GameEvent[] = []

  if (def.type === "character") {
    const ipc: InPlayCard = {
      instanceId: removed.instanceId,
      definitionId: inst.definitionId,
      drying: true,
      ready: true,
      damage: 0,
    }
    next = { ...next, inPlay: [...next.inPlay, ipc] }
  } else if (def.type === "item" || def.type === "location") {
    const ipc: InPlayCard = {
      instanceId: removed.instanceId,
      definitionId: inst.definitionId,
      drying: false,
      ready: true,
      damage: 0,
    }
    next = { ...next, inPlay: [...next.inPlay, ipc] }
  } else {
    next = pushDiscard(next, removed.instanceId)
  }

  s.players[ap] = next
  events.push({
    type: "CARD_PLAYED",
    player: ap,
    instanceId: removed.instanceId,
    definitionId: inst.definitionId,
  })

  const w = checkWinner(s)
  if (w !== null) {
    s.winner = w
    events.push({ type: "GAME_OVER", winner: w })
  }

  return { state: s, events }
}

function checkWinner(s: GameState): 0 | 1 | null {
  if (s.players[0].lore >= s.loreToWin) return 0
  if (s.players[1].lore >= s.loreToWin) return 1
  return null
}

function applyChallenge(
  state: GameState,
  attackerIndex: number,
  defenderIndex: number
): { state: GameState; events: GameEvent[] } | { error: string } {
  const s = cloneState(state)
  const ap = s.activePlayer
  const dp = ((ap + 1) % 2) as 0 | 1
  const attackerPlayer = s.players[ap]
  const defenderPlayer = s.players[dp]

  if (attackerIndex < 0 || attackerIndex >= attackerPlayer.inPlay.length) {
    return { error: "Índice atacante inválido." }
  }
  if (defenderIndex < 0 || defenderIndex >= defenderPlayer.inPlay.length) {
    return { error: "Índice defensor inválido." }
  }

  const atk = attackerPlayer.inPlay[attackerIndex]
  const def = defenderPlayer.inPlay[defenderIndex]
  const atkDef = getDef(s, atk.definitionId)
  const defDef = getDef(s, def.definitionId)
  if (!atkDef || !defDef) return { error: "Carta desconocida en mesa." }

  if (atkDef.type !== "character" || defDef.type !== "character") {
    return { error: "El desafío MVP solo permite personaje vs personaje." }
  }
  if (atk.drying) return { error: "El atacante está secando y no puede desafiar." }
  if (!atk.ready) return { error: "El atacante está exerted y no puede desafiar." }
  if (def.ready) return { error: "Solo puedes desafiar personajes exerted del oponente." }

  const atkStrength = typeof atkDef.strength === "number" ? Math.max(0, atkDef.strength) : 0
  const defStrength = typeof defDef.strength === "number" ? Math.max(0, defDef.strength) : 0
  const atkWillpower = typeof atkDef.willpower === "number" ? Math.max(0, atkDef.willpower) : 0
  const defWillpower = typeof defDef.willpower === "number" ? Math.max(0, defDef.willpower) : 0

  const events: GameEvent[] = [
    {
      type: "CHALLENGED",
      attackerPlayer: ap,
      attackerInstanceId: atk.instanceId,
      defenderPlayer: dp,
      defenderInstanceId: def.instanceId,
      attackerDamage: defStrength,
      defenderDamage: atkStrength,
    },
  ]

  const attackerAfterHit = { ...atk, ready: false, damage: atk.damage + defStrength }
  const defenderAfterHit = { ...def, damage: def.damage + atkStrength }

  let attackerUpdated = {
    ...attackerPlayer,
    inPlay: attackerPlayer.inPlay.map((c, i) => (i === attackerIndex ? attackerAfterHit : c)),
  }
  let defenderUpdated = {
    ...defenderPlayer,
    inPlay: defenderPlayer.inPlay.map((c, i) => (i === defenderIndex ? defenderAfterHit : c)),
  }

  // Banish defensor si daño >= voluntad.
  if (defWillpower > 0 && defenderAfterHit.damage >= defWillpower) {
    const removed = removeInPlayCard(defenderUpdated, defenderIndex)
    if (removed) {
      defenderUpdated = pushDiscard(removed.zone, removed.card.instanceId)
      events.push({
        type: "CARD_BANISHED",
        player: dp,
        instanceId: removed.card.instanceId,
        definitionId: removed.card.definitionId,
      })
    }
  }

  // Banish atacante si daño >= voluntad.
  if (atkWillpower > 0 && attackerAfterHit.damage >= atkWillpower) {
    const removed = removeInPlayCard(attackerUpdated, attackerIndex)
    if (removed) {
      attackerUpdated = pushDiscard(removed.zone, removed.card.instanceId)
      events.push({
        type: "CARD_BANISHED",
        player: ap,
        instanceId: removed.card.instanceId,
        definitionId: removed.card.definitionId,
      })
    }
  }

  s.players[ap] = attackerUpdated
  s.players[dp] = defenderUpdated
  return { state: s, events }
}

/** MVP: turno, ink, play, quest y desafío básico de personajes. */
export function applyAction(state: GameState, action: GameAction): ApplyResult {
  if (state.winner !== null) {
    return { ok: false, error: "La partida ya terminó." }
  }

  switch (action.type) {
    case "INK_FROM_HAND": {
      if (state.phase !== "ink") {
        return { ok: false, error: "Solo puedes entintar en la fase de tinta." }
      }
      if (state.inkedThisTurn) {
        return { ok: false, error: "Ya entintaste este turno." }
      }
      const s = cloneState(state)
      const ap = s.activePlayer
      const p = s.players[ap]
      const removed = removeHandCard(p, action.handIndex)
      if (!removed) return { ok: false, error: "Índice de mano inválido." }

      const inst = s.instances.get(removed.instanceId)
      if (!inst) return { ok: false, error: "Instancia desconocida." }
      const def = getDef(s, inst.definitionId)
      if (!def) return { ok: false, error: "Definición desconocida." }
      if (!def.inkable) {
        return { ok: false, error: "Esta carta no se puede poner en la reserva de tinta." }
      }

      const inkColor = def.inkColor ?? "unknown"
      void inkColor // reservado para UI / matching futuro

      const inkCard = {
        instanceId: removed.instanceId,
        definitionId: inst.definitionId,
        exerted: false,
      }
      s.players[ap] = {
        ...removed.zone,
        inkwell: [...removed.zone.inkwell, inkCard],
      }
      s.inkedThisTurn = true
      s.phase = "main"

      const events: GameEvent[] = [{ type: "INKED", player: ap, instanceId: removed.instanceId }]
      return { ok: true, state: s, events }
    }

    case "SKIP_INK": {
      if (state.phase !== "ink") {
        return { ok: false, error: "Solo aplica en la fase de tinta." }
      }
      const s = cloneState(state)
      s.phase = "main"
      return { ok: true, state: s, events: [] }
    }

    case "PLAY_FROM_HAND": {
      if (state.phase !== "main") {
        return { ok: false, error: "Solo puedes jugar cartas en la fase principal." }
      }
      const res = applyPlay(state, action.handIndex)
      if ("error" in res) return { ok: false, error: res.error }
      return { ok: true, state: res.state, events: res.events }
    }

    case "QUEST": {
      if (state.phase !== "main") {
        return { ok: false, error: "Solo puedes hacer quest en la fase principal." }
      }
      const s = cloneState(state)
      const ap = s.activePlayer
      const p = s.players[ap]
      const idx = action.inPlayIndex
      if (idx < 0 || idx >= p.inPlay.length) {
        return { ok: false, error: "Índice de mesa inválido." }
      }
      const ipc = p.inPlay[idx]
      const def = getDef(s, ipc.definitionId)
      if (!def) return { ok: false, error: "Definición desconocida." }
      if (def.type !== "character" && def.type !== "location") {
        return { ok: false, error: "Solo personajes y ubicaciones pueden hacer quest." }
      }
      if (ipc.drying) {
        return { ok: false, error: "Esta carta aún está secando y no puede hacer quest." }
      }
      if (!ipc.ready) {
        return { ok: false, error: "Esta carta está girada y no puede hacer quest." }
      }
      const loreGain = typeof def.lore === "number" && def.lore > 0 ? def.lore : 0
      if (loreGain <= 0) {
        return { ok: false, error: "Esta carta no tiene lore para hacer quest." }
      }

      const inPlay = p.inPlay.map((c, i) =>
        i === idx ? { ...c, ready: false } : c
      )
      s.players[ap] = { ...p, inPlay, lore: p.lore + loreGain }

      const events: GameEvent[] = [
        {
          type: "QUEST_LORE",
          player: ap,
          instanceId: ipc.instanceId,
          definitionId: ipc.definitionId,
          loreGained: loreGain,
        },
      ]

      const w = checkWinner(s)
      if (w !== null) {
        s.winner = w
        events.push({ type: "GAME_OVER", winner: w })
      }

      return { ok: true, state: s, events }
    }

    case "CHALLENGE": {
      if (state.phase !== "main") {
        return { ok: false, error: "Solo puedes desafiar en la fase principal." }
      }
      const res = applyChallenge(state, action.attackerIndex, action.defenderIndex)
      if ("error" in res) return { ok: false, error: res.error }
      return { ok: true, state: res.state, events: res.events }
    }

    case "END_MAIN": {
      if (state.phase !== "main") {
        return { ok: false, error: "Solo puedes terminar la fase principal desde la fase principal." }
      }
      const s = cloneState(state)
      const ap = s.activePlayer
      const events: GameEvent[] = [{ type: "TURN_END", player: ap }]

      s.totalTurnsCompleted += 1
      s.activePlayer = ((ap + 1) % 2) as 0 | 1
      s.phase = "begin"

      const begun = runBeginPhase(s)
      events.push(...begun.events)

      if (begun.state.winner !== null) {
        return { ok: true, state: begun.state, events }
      }

      return { ok: true, state: begun.state, events }
    }

    default:
      return { ok: false, error: "Acción no reconocida." }
  }
}

/**
 * Disney Lorcana TCG — motor de partida (VS CPU / futuro multijugador).
 * Fuente de reglas: Quick Start + Comprehensive Rules (Ravensburger).
 * Este módulo es deliberadamente incremental: las acciones no cubiertas se irán añadiendo.
 */

export type GameCardType = "character" | "action" | "item" | "location" | "song"

/** Subconjunto del catálogo necesario para validar jugadas. */
export interface GameCardDefinition {
  id: string
  name: string
  type: GameCardType
  inkCost: number
  inkable: boolean
  /** Color de la carta (Amber, Ruby, …) — para tinta y matching futuro. */
  inkColor: string | null
  lore: number | null
  strength: number | null
  willpower: number | null
}

export type GamePhase = "begin" | "ink" | "main" | "end"

export interface InkCard {
  instanceId: string
  definitionId: string
  exerted: boolean
}

export interface InPlayCard {
  instanceId: string
  definitionId: string
  /** No puede hacer quest el turno que entra (regla base personajes). */
  drying: boolean
  ready: boolean
  damage: number
}

export interface PlayerZone {
  /** Mazo: el final del array es la parte superior (robar = pop). */
  deck: string[]
  hand: string[]
  discard: string[]
  inkwell: InkCard[]
  inPlay: InPlayCard[]
  lore: number
}

export interface CardInstance {
  id: string
  definitionId: string
}

export interface GameState {
  definitions: ReadonlyMap<string, GameCardDefinition>
  instances: ReadonlyMap<string, CardInstance>
  players: [PlayerZone, PlayerZone]
  activePlayer: 0 | 1
  firstPlayer: 0 | 1
  phase: GamePhase
  /** Cada vez que termina el turno de un jugador (incrementa al pasar de main → siguiente). */
  totalTurnsCompleted: number
  /** El jugador inicial no roba en su primer turno (Quick Start). true hasta aplicar esa omisión una vez. */
  pendingSkipFirstDraw: boolean
  inkedThisTurn: boolean
  winner: 0 | 1 | null
  /** Lore objetivo para ganar (reglamento construido típico: 20). */
  loreToWin: number
}

export type GameAction =
  | { type: "INK_FROM_HAND"; handIndex: number }
  | { type: "SKIP_INK" }
  | { type: "PLAY_FROM_HAND"; handIndex: number }
  /** Personaje o ubicación en juego: enviar a la aventura (gana lore, se exierte). */
  | { type: "QUEST"; inPlayIndex: number }
  /**
   * Desafío entre personajes.
   * Regla base MVP: solo personajes vs personajes; el defensor debe estar exerted.
   */
  | { type: "CHALLENGE"; attackerIndex: number; defenderIndex: number }
  | { type: "END_MAIN" }

export type GameEvent =
  | { type: "TURN_BEGIN"; player: 0 | 1 }
  | { type: "DRAW"; player: 0 | 1; instanceId: string | null; skippedFirst: boolean }
  | { type: "INKED"; player: 0 | 1; instanceId: string }
  | { type: "CARD_PLAYED"; player: 0 | 1; instanceId: string; definitionId: string }
  | { type: "QUEST_LORE"; player: 0 | 1; instanceId: string; definitionId: string; loreGained: number }
  | {
      type: "CHALLENGED"
      attackerPlayer: 0 | 1
      attackerInstanceId: string
      defenderPlayer: 0 | 1
      defenderInstanceId: string
      attackerDamage: number
      defenderDamage: number
    }
  | { type: "CARD_BANISHED"; player: 0 | 1; instanceId: string; definitionId: string }
  | { type: "TURN_END"; player: 0 | 1 }
  | { type: "GAME_OVER"; winner: 0 | 1 }

export type ApplyResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: string }

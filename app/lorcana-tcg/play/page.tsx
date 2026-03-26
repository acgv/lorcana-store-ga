"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/hooks/use-user"
import { supabase } from "@/lib/db"
import type { Card as CatalogCard } from "@/lib/types"
import type { DeckRow } from "@/lib/deck-hydration"
import type { ApplyResult, GameAction, GameEvent, GameState } from "@/lib/lorcana-game"
import { applyAction, buildDefinitionMap, startGame } from "@/lib/lorcana-game"
import { Bot, Crown, Lock, Play, RotateCcw, Sword, User2 } from "lucide-react"

type DeckForGame = {
  id: string
  name: string
  cards: Array<{ cardId: string; quantity: number }>
}

type FlyAnim = {
  id: string
  src: string
  alt: string
  left: number
  top: number
  width: number
  height: number
  dx: number
  dy: number
  phase: "start" | "end"
}

type DeckCoachInsight = {
  id: string
  title: string
  detail: string
  tone: "good" | "warn" | "tip"
}

type AccessInfo = {
  isPro: boolean
  source: string
  maxDailyGames: number | null
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

function phaseHint(phase: GameState["phase"]): string {
  switch (phase) {
    case "begin":
      return "Preparando y robando…"
    case "ink":
      return "Puedes entintar 1 carta (opcional)."
    case "main":
      return "Juega cartas, haz quest o challenge. Luego termina turno."
    case "end":
      return "Cerrando turno…"
    default:
      return ""
  }
}

type TutorialProgress = {
  ink: boolean
  play: boolean
  questOrChallenge: boolean
  endTurn: boolean
}

const EMPTY_TUTORIAL_PROGRESS: TutorialProgress = {
  ink: false,
  play: false,
  questOrChallenge: false,
  endTurn: false,
}

export default function PlayVsCpuPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading } = useUser()

  const [decks, setDecks] = useState<DeckForGame[]>([])
  const [allCards, setAllCards] = useState<CatalogCard[]>([])
  const [selectedDeckId, setSelectedDeckId] = useState<string>("")
  const [loadingData, setLoadingData] = useState(false)
  const [playerMode, setPlayerMode] = useState<"manual" | "auto">("manual")
  const [autoStyle, setAutoStyle] = useState<"step" | "continuous">("step")
  const [autoDelayMs, setAutoDelayMs] = useState(900)
  const [tutorialEnabled, setTutorialEnabled] = useState(true)
  const [tutorialProgress, setTutorialProgress] = useState<TutorialProgress>(EMPTY_TUTORIAL_PROGRESS)
  const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null)
  const [todayGames, setTodayGames] = useState(0)
  const [remainingDailyGames, setRemainingDailyGames] = useState<number | null>(null)

  const [lockedDeckId, setLockedDeckId] = useState<string | null>(null)
  const [game, setGame] = useState<GameState | null>(null)
  const [events, setEvents] = useState<GameEvent[]>([])
  const [engineTurns, setEngineTurns] = useState<Array<{ index: number; actor: "player" | "cpu" | "system"; action: GameAction; events: GameEvent[] }>>([])
  const [cpuThinking, setCpuThinking] = useState(false)
  const cpuAbortRef = useRef(false)
  const savedReplayRef = useRef(false)

  const [pendingChallengeAttacker, setPendingChallengeAttacker] = useState<number | null>(null)
  const [pendingChallengeDefender, setPendingChallengeDefender] = useState<number | null>(null)
  const [highlightInstanceIds, setHighlightInstanceIds] = useState<Record<string, "quest" | "challenge" | "banish">>({})
  const [damageFlash, setDamageFlash] = useState<Record<string, number>>({})
  const [discardPulse, setDiscardPulse] = useState<{ player: boolean; cpu: boolean }>({ player: false, cpu: false })
  const [banishTray, setBanishTray] = useState<Array<{ instanceId: string; definitionId: string; player: 0 | 1 }>>([])
  const [flyAnims, setFlyAnims] = useState<FlyAnim[]>([])
  const processedEventCountRef = useRef(0)
  const tutorialProcessedCountRef = useRef(0)
  const inPlayElRef = useRef<Record<string, HTMLDivElement | null>>({})
  const discardPlayerElRef = useRef<HTMLDivElement | null>(null)
  const discardCpuElRef = useRef<HTMLDivElement | null>(null)

  const selectedDeck = useMemo(
    () => decks.find((d) => d.id === (lockedDeckId || selectedDeckId)) || null,
    [decks, lockedDeckId, selectedDeckId]
  )

  const effectiveDeckId = lockedDeckId ?? selectedDeckId
  const deckSelectDisabled = lockedDeckId !== null

  const cardById = useMemo(() => {
    return new Map(allCards.map((c) => [String(c.id).toLowerCase().trim(), c]))
  }, [allCards])

  const uiPlayer = game?.players[0] ?? null
  const uiCpu = game?.players[1] ?? null
  const playerReadyInk = useMemo(() => {
    if (!uiPlayer) return 0
    return uiPlayer.inkwell.filter((c) => !c.exerted).length
  }, [uiPlayer])

  const cpuExertedDefenders = useMemo(() => {
    if (!uiCpu) return []
    return uiCpu.inPlay.map((c, idx) => ({ c, idx })).filter((x) => !x.c.ready)
  }, [uiCpu])

  const deckCoachInsights = useMemo((): DeckCoachInsight[] => {
    if (!game || game.winner === null) return []

    const playerTurns = engineTurns.filter((t) =>
      t.events.some((e) => e.type === "TURN_BEGIN" && e.player === 0)
    ).length
    const playerInk = engineTurns.filter((t) => t.actor === "player" && t.action.type === "INK_FROM_HAND").length
    const playerPlays = engineTurns.filter((t) => t.actor === "player" && t.action.type === "PLAY_FROM_HAND").length
    const playerQuests = engineTurns.filter((t) => t.actor === "player" && t.action.type === "QUEST").length
    const playerChallenges = engineTurns.filter((t) => t.actor === "player" && t.action.type === "CHALLENGE").length

    const loreByPlayer = engineTurns.flatMap((t) => t.events).reduce(
      (acc, e) => {
        if (e.type === "QUEST_LORE") {
          if (e.player === 0) acc.player += e.loreGained
          if (e.player === 1) acc.cpu += e.loreGained
        }
        return acc
      },
      { player: 0, cpu: 0 }
    )

    const insights: DeckCoachInsight[] = []
    const turnsWithoutInk = Math.max(0, playerTurns - playerInk)
    if (turnsWithoutInk >= 2) {
      insights.push({
        id: "ink-consistency",
        tone: "warn",
        title: "Consistencia de tinta",
        detail: `Saltaste tinta en ${turnsWithoutInk} turnos. Entinta más seguido al inicio para no trabarte en costes.`,
      })
    } else {
      insights.push({
        id: "ink-good",
        tone: "good",
        title: "Buen ritmo de inkwell",
        detail: "Tu curva de tinta fue estable. Eso ayuda a mantener opciones legales en main.",
      })
    }

    if (playerQuests === 0 && playerPlays > 0) {
      insights.push({
        id: "quest-missing",
        tone: "warn",
        title: "Faltó convertir mesa en lore",
        detail: "Jugaste cartas, pero no hiciste quest. Prioriza cerrar turnos con 1 quest cuando sea seguro.",
      })
    } else if (playerQuests > 0) {
      insights.push({
        id: "quest-good",
        tone: "good",
        title: "Buen enfoque de lore",
        detail: `Lograste ${playerQuests} quest(s) y sumaste ${loreByPlayer.player} de lore.`,
      })
    }

    if (playerChallenges === 0 && loreByPlayer.cpu >= 8) {
      insights.push({
        id: "challenge-tip",
        tone: "tip",
        title: "Tip de tempo defensivo",
        detail: "La CPU acumuló bastante lore. Cuando puedas, usa challenge para frenar su mesa exerted.",
      })
    } else if (playerChallenges > 0) {
      insights.push({
        id: "challenge-good",
        tone: "good",
        title: "Interacción correcta",
        detail: `Hiciste ${playerChallenges} challenge(s), eso evita quest gratis del rival.`,
      })
    }

    if (insights.length < 3) {
      insights.push({
        id: "next-step",
        tone: "tip",
        title: "Siguiente paso recomendado",
        detail: "Turno ideal: entintar (si conviene) -> jugar -> quest/challenge -> terminar turno.",
      })
    }

    return insights.slice(0, 3)
  }, [engineTurns, game])

  const tutorialItems = useMemo(
    () => [
      { key: "ink", label: "Entinta 1 carta", done: tutorialProgress.ink },
      { key: "play", label: "Juega 1 carta", done: tutorialProgress.play },
      { key: "questOrChallenge", label: "Haz Quest o Challenge", done: tutorialProgress.questOrChallenge },
      { key: "endTurn", label: "Termina tu turno", done: tutorialProgress.endTurn },
    ],
    [tutorialProgress]
  )
  const tutorialCompletedCount = tutorialItems.filter((x) => x.done).length
  const tutorialPercent = Math.round((tutorialCompletedCount / tutorialItems.length) * 100)
  const tutorialNextLabel = tutorialItems.find((x) => !x.done)?.label ?? "Tutorial completado"

  const extractInstanceIds = useCallback((e: GameEvent): string[] => {
    switch (e.type) {
      case "QUEST_LORE":
        return [e.instanceId]
      case "CHALLENGED":
        return [e.attackerInstanceId, e.defenderInstanceId]
      case "CARD_BANISHED":
        return [e.instanceId]
      case "INKED": {
        return [e.instanceId]
      }
      default:
        return []
    }
  }, [])

  const formatEvent = useCallback(
    (e: GameEvent): string => {
      if (!game) return e.type
      const defName = (definitionId: string) => game.definitions.get(definitionId)?.name ?? definitionId

      switch (e.type) {
        case "TURN_BEGIN":
          return `Inicio de turno: ${e.player === 0 ? "Jugador" : "CPU"}`
        case "DRAW":
          return e.skippedFirst
            ? `Robo omitido (jugador inicial)`
            : e.instanceId
              ? `${e.player === 0 ? "Jugador" : "CPU"} roba 1 carta`
              : `${e.player === 0 ? "Jugador" : "CPU"} no puede robar (mazo vacío)`
        case "INKED": {
          const inst = game.instances.get(e.instanceId)
          return `${e.player === 0 ? "Jugador" : "CPU"} entinta: ${inst ? defName(inst.definitionId) : "carta"}`
        }
        case "CARD_PLAYED": {
          return `${e.player === 0 ? "Jugador" : "CPU"} juega: ${defName(e.definitionId)}`
        }
        case "QUEST_LORE": {
          return `${e.player === 0 ? "Jugador" : "CPU"} hace quest con ${defName(e.definitionId)} (+${e.loreGained} lore)`
        }
        case "CHALLENGED": {
          const atkInst = game.instances.get(e.attackerInstanceId)
          const defInst = game.instances.get(e.defenderInstanceId)
          const atkName = atkInst ? defName(atkInst.definitionId) : "atacante"
          const defNameStr = defInst ? defName(defInst.definitionId) : "defensor"
          return `Challenge: ${atkName} ↔ ${defNameStr} (daño ${e.defenderDamage}/${e.attackerDamage})`
        }
        case "CARD_BANISHED": {
          const inst = game.instances.get(e.instanceId)
          return `${e.player === 0 ? "Jugador" : "CPU"} pierde (banish): ${inst ? defName(inst.definitionId) : "carta"}`
        }
        case "TURN_END":
          return `Fin de turno: ${e.player === 0 ? "Jugador" : "CPU"}`
        case "GAME_OVER":
          return `Partida terminada: gana ${e.winner === 0 ? "Jugador" : "CPU"}`
        default:
          return e.type
      }
    },
    [game]
  )

  useEffect(() => {
    if (!loading && !user) router.push("/lorcana-tcg/login")
  }, [loading, router, user])

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      if (!user?.id) return
      setLoadingData(true)
      try {
        if (!supabase) throw new Error("Supabase no está configurado")
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token
        if (!token) throw new Error("No hay sesión activa")

        const [decksRes, cardsRes, quotaRes] = await Promise.all([
          fetch("/api/decks", { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/cards?t=${Date.now()}`, { cache: "no-store" }),
          fetch("/api/games/vs-cpu/quota", { headers: { Authorization: `Bearer ${token}` } }),
        ])

        const decksJson = await decksRes.json()
        const cardsJson = await cardsRes.json()
        const quotaJson = await quotaRes.json()

        if (!decksJson.success) throw new Error(decksJson.error || "No se pudieron cargar mazos")
        if (!cardsJson.success) throw new Error(cardsJson.error || "No se pudo cargar catálogo")

        const loadedDecks = (decksJson.data || []) as DeckRow[]
        if (cancelled) return

        setDecks(
          loadedDecks.map((d) => ({
            id: d.id,
            name: d.name,
            cards: d.cards,
          }))
        )
        setAllCards(cardsJson.data || [])
        if (loadedDecks.length > 0) setSelectedDeckId((prev) => prev || loadedDecks[0].id)
        if (quotaJson?.success) {
          setAccessInfo(quotaJson.data?.access || null)
          setTodayGames(Number(quotaJson.data?.todayGames || 0))
          setRemainingDailyGames(
            quotaJson.data?.remainingDailyGames == null ? null : Number(quotaJson.data.remainingDailyGames || 0)
          )
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) {
          toast({
            title: "Juego",
            description: e instanceof Error ? e.message : "No se pudieron cargar los datos",
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) setLoadingData(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [toast, user?.id])

  const resetGame = useCallback(() => {
    cpuAbortRef.current = true
    savedReplayRef.current = false
    setLockedDeckId(null)
    setGame(null)
    setEvents([])
    setEngineTurns([])
    setCpuThinking(false)
    setPendingChallengeAttacker(null)
    setPendingChallengeDefender(null)
    setHighlightInstanceIds({})
    setBanishTray([])
    setFlyAnims([])
    setTutorialProgress(EMPTY_TUTORIAL_PROGRESS)
    // Reset auto UX defaults so next start is guided.
    setAutoStyle("step")
    setAutoDelayMs(900)
    processedEventCountRef.current = 0
    tutorialProcessedCountRef.current = 0
  }, [])

  const appendApply = useCallback(
    (res: ApplyResult) => {
      if (!res.ok) {
        toast({ title: "Movimiento inválido", description: res.error, variant: "destructive" })
        return false
      }
      setGame(res.state)
      setEvents((prev) => [...prev, ...res.events])
      return true
    },
    [toast]
  )

  const startMatch = useCallback(() => {
    if (!selectedDeckId) return
    const deck = decks.find((d) => d.id === selectedDeckId)
    if (!deck) return
    if (allCards.length === 0) {
      toast({ title: "Juego", description: "Catálogo no cargado", variant: "destructive" })
      return
    }

    cpuAbortRef.current = false
    const defs = buildDefinitionMap(allCards)
    const started = startGame({
      definitions: defs,
      deck0: deck.cards,
      deck1: deck.cards,
      firstPlayer: 0,
      loreToWin: 20,
    })

    if (!started.ok) {
      toast({ title: "No se pudo iniciar", description: started.error, variant: "destructive" })
      return
    }

    // Auto should start guided by default (no runaway autoplay).
    setAutoStyle("step")
    setLockedDeckId(deck.id)
    setGame(started.state)
    setEvents(started.events)
    setEngineTurns([{ index: 1, actor: "system", action: { type: "SKIP_INK" } as any, events: started.events }])
    setTutorialProgress(EMPTY_TUTORIAL_PROGRESS)
    tutorialProcessedCountRef.current = started.events.length
    savedReplayRef.current = false
    toast({ title: "Partida iniciada", description: "Motor Lorcana activo (MVP): ink, play, quest y challenge." })
  }, [allCards, decks, selectedDeckId, toast])

  const applyAndLog = useCallback(
    (actor: "player" | "cpu", state: GameState, action: GameAction): ApplyResult => {
      const res = applyAction(state, action)
      if (res.ok) {
        setGame(res.state)
        setEvents((prev) => [...prev, ...res.events])
        setEngineTurns((prev) => [
          ...prev,
          { index: prev.length + 1, actor, action, events: res.events },
        ])
      }
      return res
    },
    []
  )

  const runPlayerSequence = useCallback(
    (actions: GameAction[]) => {
      if (!game) {
        toast({ title: "Juego", description: "Aún no hay partida iniciada.", variant: "destructive" })
        return
      }
      if (game.winner !== null) {
        toast({ title: "Partida terminada", description: "Reinicia para jugar otra.", variant: "destructive" })
        return
      }
      if (game.activePlayer !== 0) {
        toast({ title: "No es tu turno", description: "Espera a que termine la CPU.", variant: "destructive" })
        return
      }
      if (cpuThinking) {
        toast({ title: "CPU", description: "La CPU está pensando. Espera un momento.", variant: "destructive" })
        return
      }

      let s: GameState = game
      for (const a of actions) {
        const res = applyAndLog("player", s, a)
        if (!res.ok) {
          toast({ title: "Movimiento inválido", description: res.error, variant: "destructive" })
          return
        }
        s = res.state
      }
    },
    [applyAndLog, cpuThinking, game, toast]
  )

  const chooseOneAutoActionForPlayer = useCallback(
    (s: GameState): GameAction[] => {
      // Devuelve 0..n acciones; preferimos completar un turno de forma entendible.
      // Importante: devolvemos SOLO acciones legales (probando contra el motor).
      const firstLegal = (candidates: GameAction[]): GameAction[] => {
        for (const a of candidates) {
          const r = applyAction(s, a)
          if (r.ok) return [a]
        }
        return []
      }

      if (s.phase === "ink") {
        // intenta entintar; si no puede, salta
        const inkCands: GameAction[] = s.players[0].hand.map((_, i) => ({ type: "INK_FROM_HAND", handIndex: i }))
        const ink = firstLegal(inkCands)
        if (ink.length) return ink
        return firstLegal([{ type: "SKIP_INK" }])
      }

      if (s.phase === "main") {
        // 1) jugar primera carta legal
        const playCands: GameAction[] = s.players[0].hand.map((_, i) => ({ type: "PLAY_FROM_HAND", handIndex: i }))
        const play = firstLegal(playCands)
        if (play.length) return play

        // 2) quest si puede
        const questCands: GameAction[] = s.players[0].inPlay.map((_, i) => ({ type: "QUEST", inPlayIndex: i }))
        const quest = firstLegal(questCands)
        if (quest.length) return quest

        // 3) terminar turno
        return firstLegal([{ type: "END_MAIN" }])
      }

      return []
    },
    []
  )

  const chooseOneAutoActionForCpu = useCallback(
    (s: GameState): GameAction[] => {
      const firstLegal = (candidates: GameAction[]): GameAction[] => {
        for (const a of candidates) {
          const r = applyAction(s, a)
          if (r.ok) return [a]
        }
        return []
      }

      if (s.phase === "ink") {
        const inkCands: GameAction[] = s.players[1].hand.map((_, i) => ({ type: "INK_FROM_HAND", handIndex: i }))
        const ink = firstLegal(inkCands)
        if (ink.length) return ink
        return firstLegal([{ type: "SKIP_INK" }])
      }

      if (s.phase === "main") {
        // quest primero (mayor lore)
        let bestIdx: number | null = null
        let bestLore = -1
        for (let i = 0; i < s.players[1].inPlay.length; i++) {
          const c = s.players[1].inPlay[i]
          if (c.drying || !c.ready) continue
          const def = s.definitions.get(c.definitionId)
          const lore = def && typeof def.lore === "number" ? def.lore : 0
          if (lore > bestLore) {
            bestLore = lore
            bestIdx = i
          }
        }
        if (bestIdx !== null && bestLore > 0) {
          const q = firstLegal([{ type: "QUEST", inPlayIndex: bestIdx }])
          if (q.length) return q
        }

        // jugar primera legal
        const playCands: GameAction[] = s.players[1].hand.map((_, i) => ({ type: "PLAY_FROM_HAND", handIndex: i }))
        const play = firstLegal(playCands)
        if (play.length) return play
        return firstLegal([{ type: "END_MAIN" }])
      }

      return []
    },
    []
  )

  const runAutoTurn = useCallback(
    (actor: "player" | "cpu", start: GameState): GameState => {
      // Ejecuta acciones hasta que cambie el turno (activePlayer) o termine la partida.
      let s = start
      const targetPlayer = actor === "player" ? 0 : 1
      for (let guard = 0; guard < 50; guard++) {
        if (s.winner !== null) break
        if (s.activePlayer !== targetPlayer) break

        const actions =
          actor === "player" ? chooseOneAutoActionForPlayer(s) : chooseOneAutoActionForCpu(s)
        if (actions.length === 0) break

        for (const a of actions) {
          const res = applyAndLog(actor, s, a)
          if (!res.ok) return s
          s = res.state
        }
      }
      return s
    },
    [applyAndLog, chooseOneAutoActionForCpu, chooseOneAutoActionForPlayer]
  )

  const advanceAuto = useCallback(() => {
    if (!game) return
    if (game.winner !== null) return
    if (cpuThinking) return
    if (playerMode !== "auto") return

    // Avanza 1 turno completo del jugador activo.
    if (game.activePlayer === 0) {
      runAutoTurn("player", game)
      return
    }
    if (game.activePlayer === 1) {
      runAutoTurn("cpu", game)
    }
  }, [cpuThinking, game, playerMode, runAutoTurn])

  const playAutoForPlayer = useCallback(() => {
    if (!game) return
    if (game.winner !== null) return
    if (game.activePlayer !== 0) return
    if (cpuThinking) return

    // Mantener compatibilidad: acción “única” (usada por botón manual si lo dejamos).
    const actions = chooseOneAutoActionForPlayer(game)
    if (actions.length === 0) return
    runPlayerSequence(actions)
  }, [chooseOneAutoActionForPlayer, cpuThinking, game, runPlayerSequence])

  // Auto-play: si el modo del jugador es auto, ejecuta jugadas solo en tu turno.
  useEffect(() => {
    if (playerMode !== "auto") return
    if (autoStyle !== "continuous") return
    if (!game) return
    if (game.winner !== null) return
    if (cpuThinking) return
    // En continuo avanzamos por turno: jugador -> cpu -> jugador...

    const t = window.setTimeout(() => {
      advanceAuto()
    }, Math.max(250, Math.floor(autoDelayMs)))

    return () => window.clearTimeout(t)
  }, [advanceAuto, autoDelayMs, autoStyle, cpuThinking, game, playerMode])

  const playerAction = useCallback(
    (action: GameAction) => {
      if (!game) {
        toast({ title: "Juego", description: "Aún no hay partida iniciada.", variant: "destructive" })
        return
      }
      if (game.winner !== null) {
        toast({ title: "Partida terminada", description: "Reinicia para jugar otra.", variant: "destructive" })
        return
      }
      if (game.activePlayer !== 0) {
        toast({ title: "No es tu turno", description: "Espera a que termine la CPU.", variant: "destructive" })
        return
      }
      if (cpuThinking) {
        toast({ title: "CPU", description: "La CPU está pensando. Espera un momento.", variant: "destructive" })
        return
      }
      if (action.type !== "CHALLENGE") {
        setPendingChallengeAttacker(null)
        setPendingChallengeDefender(null)
      }
      const res = applyAndLog("player", game, action)
      if (!res.ok) toast({ title: "Movimiento inválido", description: res.error, variant: "destructive" })
    },
    [applyAndLog, cpuThinking, game, toast]
  )

  const cpuTurn = useCallback(async () => {
    if (!game) return
    if (game.winner !== null) return
    if (game.activePlayer !== 1) return
    if (cpuThinking) return
    // Si estamos en auto guiado (step), no ejecutamos la CPU sola.
    if (playerMode === "auto" && autoStyle === "step") return

    setCpuThinking(true)
    try {
      let s: GameState = game
      for (let guard = 0; guard < 30; guard++) {
        if (cpuAbortRef.current) break
        if (s.winner !== null) break
        if (s.activePlayer !== 1) break

        if (s.phase === "ink") {
          const hand = s.players[1].hand
          let did = false
          for (let i = 0; i < hand.length; i++) {
            const tryInk = applyAndLog("cpu", s, { type: "INK_FROM_HAND", handIndex: i })
            if (tryInk.ok) {
              s = tryInk.state
              did = true
              break
            }
          }
          if (!did) {
            const skip = applyAndLog("cpu", s, { type: "SKIP_INK" })
            if (!skip.ok) break
            s = skip.state
          }
          await sleep(250)
          continue
        }

        if (s.phase === "main") {
          // Quest (mejor lore primero)
          const inPlay = s.players[1].inPlay
          let bestIdx: number | null = null
          let bestLore = -1
          for (let i = 0; i < inPlay.length; i++) {
            const c = inPlay[i]
            if (c.drying || !c.ready) continue
            const def = s.definitions.get(c.definitionId)
            const lore = def && typeof def.lore === "number" ? def.lore : 0
            if (lore > bestLore) {
              bestLore = lore
              bestIdx = i
            }
          }
          if (bestIdx !== null && bestLore > 0) {
            const q = applyAndLog("cpu", s, { type: "QUEST", inPlayIndex: bestIdx })
            if (q.ok) {
              s = q.state
              await sleep(250)
              continue
            }
          }

          // Play (primer legal)
          const hand = s.players[1].hand
          let played = false
          for (let i = 0; i < hand.length; i++) {
            const p = applyAndLog("cpu", s, { type: "PLAY_FROM_HAND", handIndex: i })
            if (p.ok) {
              s = p.state
              played = true
              await sleep(250)
              break
            }
          }
          if (played) continue

          const end = applyAndLog("cpu", s, { type: "END_MAIN" })
          if (!end.ok) break
          s = end.state
          await sleep(250)
          continue
        }

        break
      }
    } finally {
      setCpuThinking(false)
    }
  }, [applyAndLog, autoStyle, cpuThinking, game, playerMode])

  useEffect(() => {
    void cpuTurn()
  }, [cpuTurn])

  useEffect(() => {
    if (!game) return
    const prevCount = processedEventCountRef.current
    if (events.length <= prevCount) return

    const newEvents = events.slice(prevCount)
    processedEventCountRef.current = events.length

    const nextHighlights: Record<string, "quest" | "challenge" | "banish"> = {}
    const nextDamageFlash: Record<string, number> = {}
    const nextTray: Array<{ instanceId: string; definitionId: string; player: 0 | 1 }> = []
    let pulsePlayerDiscard = false
    let pulseCpuDiscard = false
    const nextFly: FlyAnim[] = []

    for (const e of newEvents) {
      if (e.type === "QUEST_LORE") {
        nextHighlights[e.instanceId] = "quest"
      }
      if (e.type === "CHALLENGED") {
        nextHighlights[e.attackerInstanceId] = "challenge"
        nextHighlights[e.defenderInstanceId] = "challenge"
        nextDamageFlash[e.attackerInstanceId] = Date.now()
        nextDamageFlash[e.defenderInstanceId] = Date.now()
      }
      if (e.type === "CARD_BANISHED") {
        // Para “en vivo”: mostrar un tray con la carta que fue banish.
        const inst = game.instances.get(e.instanceId)
        if (inst) {
          nextTray.push({ instanceId: e.instanceId, definitionId: inst.definitionId, player: e.player })

          // Animación: volar desde mesa → descarte.
          const fromEl = inPlayElRef.current[e.instanceId]
          const toEl = e.player === 0 ? discardPlayerElRef.current : discardCpuElRef.current
          const def = game.definitions.get(inst.definitionId)
          const cat = def ? cardById.get(def.id) : null
          const src = cat?.image || "/placeholder.svg"
          const alt = def?.name || "Carta"
          if (fromEl && toEl) {
            const fr = fromEl.getBoundingClientRect()
            const tr = toEl.getBoundingClientRect()
            const startCx = fr.left + fr.width / 2
            const startCy = fr.top + fr.height / 2
            const endCx = tr.left + tr.width / 2
            const endCy = tr.top + tr.height / 2
            nextFly.push({
              id: `${e.instanceId}_${Date.now()}`,
              src,
              alt,
              left: fr.left,
              top: fr.top,
              width: Math.max(56, Math.min(120, fr.width)),
              height: Math.max(78, Math.min(168, fr.height)),
              dx: endCx - startCx,
              dy: endCy - startCy,
              phase: "start",
            })
          }
        }
        nextHighlights[e.instanceId] = "banish"
        if (e.player === 0) pulsePlayerDiscard = true
        if (e.player === 1) pulseCpuDiscard = true
      }
    }

    if (Object.keys(nextHighlights).length > 0) {
      setHighlightInstanceIds((prev) => ({ ...prev, ...nextHighlights }))
      window.setTimeout(() => {
        setHighlightInstanceIds((prev) => {
          const copy = { ...prev }
          for (const k of Object.keys(nextHighlights)) delete copy[k]
          return copy
        })
      }, 900)
    }

    if (Object.keys(nextDamageFlash).length > 0) {
      setDamageFlash((prev) => ({ ...prev, ...nextDamageFlash }))
      window.setTimeout(() => {
        setDamageFlash((prev) => {
          const copy = { ...prev }
          for (const k of Object.keys(nextDamageFlash)) delete copy[k]
          return copy
        })
      }, 900)
    }

    if (pulsePlayerDiscard || pulseCpuDiscard) {
      setDiscardPulse({ player: pulsePlayerDiscard, cpu: pulseCpuDiscard })
      window.setTimeout(() => setDiscardPulse({ player: false, cpu: false }), 600)
    }

    if (nextTray.length > 0) {
      setBanishTray((prev) => [...nextTray, ...prev].slice(0, 6))
      window.setTimeout(() => {
        setBanishTray((prev) => prev.filter((x) => !nextTray.some((n) => n.instanceId === x.instanceId)))
      }, 1800)
    }

    if (nextFly.length > 0) {
      setFlyAnims((prev) => [...prev, ...nextFly])
      // Cambiar a fase end en el siguiente frame (para disparar transición CSS).
      requestAnimationFrame(() => {
        setFlyAnims((prev) =>
          prev.map((a) => (nextFly.some((n) => n.id === a.id) ? { ...a, phase: "end" } : a))
        )
      })
      window.setTimeout(() => {
        setFlyAnims((prev) => prev.filter((a) => !nextFly.some((n) => n.id === a.id)))
      }, 750)
    }
  }, [events, game])

  useEffect(() => {
    if (!tutorialEnabled) return
    if (!game) return
    if (events.length <= tutorialProcessedCountRef.current) return

    const newEvents = events.slice(tutorialProcessedCountRef.current)
    tutorialProcessedCountRef.current = events.length

    setTutorialProgress((prev) => {
      const next = { ...prev }
      for (const e of newEvents) {
        if (e.type === "INKED" && e.player === 0) next.ink = true
        if (e.type === "CARD_PLAYED" && e.player === 0) next.play = true
        if ((e.type === "QUEST_LORE" || e.type === "CHALLENGED") && e.player === 0) next.questOrChallenge = true
        if (e.type === "TURN_END" && e.player === 0) next.endTurn = true
      }
      return next
    })
  }, [events, game, tutorialEnabled])

  useEffect(() => {
    if (!game || !lockedDeckId || !selectedDeck) return
    if (game.winner === null) return
    if (savedReplayRef.current) return
    if (engineTurns.length === 0) return

    savedReplayRef.current = true
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        if (!token) throw new Error("No hay sesión activa")

        const res = await fetch("/api/games/vs-cpu/finish-engine", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            deckId: lockedDeckId,
            deckName: selectedDeck.name,
            result: game.winner === 0 ? "player" : "cpu",
            engineTurns: engineTurns.map((t) => ({
              index: t.index,
              actor: t.actor,
              action: t.action,
              events: t.events,
            })),
          }),
        })

        const json = await res.json()
        if (!json.success) {
          const msg =
            json.code === "FREE_DAILY_GAMES_LIMIT_REACHED"
              ? `${json.error} Suscribete a Pro para partidas ilimitadas.`
              : json.error || "No se pudo guardar el replay"
          throw new Error(msg)
        }
        if (json?.data?.access) setAccessInfo(json.data.access)
        setTodayGames((prev) => prev + 1)
        setRemainingDailyGames((prev) => (prev == null ? null : Math.max(0, prev - 1)))
        toast({ title: "Replay guardado", description: "Puedes verlo en Mis Partidas." })
      } catch (e) {
        console.error(e)
        savedReplayRef.current = false
        toast({
          title: "Error al guardar replay",
          description: e instanceof Error ? e.message : "No se pudo guardar el replay",
          variant: "destructive",
        })
      }
    })()
  }, [engineTurns, game, lockedDeckId, selectedDeck, toast])

  if (loading || !user) return null

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Overlay: animaciones "carta vuela" */}
        {flyAnims.length > 0 && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {flyAnims.map((a) => (
              <div
                key={a.id}
                style={{
                  position: "fixed",
                  left: a.left,
                  top: a.top,
                  width: a.width,
                  height: a.height,
                  transformOrigin: "center center",
                  transform:
                    a.phase === "end"
                      ? `translate(${a.dx}px, ${a.dy}px) scale(0.25) rotate(-6deg)`
                      : "translate(0px, 0px) scale(1) rotate(0deg)",
                  opacity: a.phase === "end" ? 0.15 : 1,
                  transition: "transform 650ms ease, opacity 650ms ease",
                  borderRadius: 10,
                  overflow: "hidden",
                  boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
                }}
              >
                <Image src={a.src} alt={a.alt} fill className="object-cover" sizes="120px" unoptimized={a.src.startsWith("http")} />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-black">Jugar vs CPU</h1>
            <p className="text-muted-foreground mt-1">
              Partida con motor Lorcana (MVP): fases, inkwell, jugar cartas, quest y challenge.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/lorcana-tcg/my-decks">
              <Button variant="outline">Ir a Mis Mazos</Button>
            </Link>
          </div>
        </div>

        {/* Config arriba para dar más espacio a la partida */}
        <Card className="bg-gradient-to-b from-card to-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sword className="h-4 w-4" /> Configuración
              </CardTitle>
              <CardDescription>Elige mazo y pulsa iniciar. El mazo queda fijado hasta reiniciar.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-12 rounded-md border bg-muted/20 p-3 text-xs space-y-2">
                {accessInfo?.isPro ? (
                  <p>
                    <span className="font-semibold text-foreground">Lorcana Pro activo</span> · partidas diarias ilimitadas.
                  </p>
                ) : remainingDailyGames != null && remainingDailyGames <= 0 ? (
                  /* Cuota agotada */
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <p className="text-destructive font-semibold">
                      Has alcanzado el limite de {accessInfo?.maxDailyGames ?? 3} partidas diarias (Free).
                    </p>
                    <Link href="/lorcana-tcg/subscribe">
                      <Button size="sm" variant="default" className="gap-1 text-xs">
                        <Crown className="h-3 w-3" /> Suscribirme a Pro
                      </Button>
                    </Link>
                  </div>
                ) : (
                  /* Cuota disponible */
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <p>
                      Te quedan{" "}
                      <span className="font-semibold text-foreground">{remainingDailyGames ?? "..."}</span>{" "}
                      partidas hoy{" "}
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Free</Badge>
                    </p>
                    <Link href="/lorcana-tcg/subscribe" className="text-primary underline underline-offset-2 hover:text-primary/80">
                      Suscribirme a Pro
                    </Link>
                  </div>
                )}
              </div>
              <div className="md:col-span-6 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  Mazo
                  {deckSelectDisabled && (
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <Lock className="h-3 w-3" /> Fijado
                    </Badge>
                  )}
                </p>
                <Select
                  value={effectiveDeckId}
                  onValueChange={(v) => {
                    if (!deckSelectDisabled) setSelectedDeckId(v)
                  }}
                  disabled={deckSelectDisabled || loadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Elige un mazo" />
                  </SelectTrigger>
                  <SelectContent>
                    {decks.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedDeck && (
                  <div className="rounded-md border p-3 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">{selectedDeck.name}</span>
                    </p>
                    <p>{selectedDeck.cards.length} cartas únicas</p>
                    <p>{selectedDeck.cards.reduce((acc, c) => acc + c.quantity, 0)} cartas totales</p>
                  </div>
                )}
              </div>

              <div className="md:col-span-3 space-y-2">
                <p className="text-sm font-medium">Modo jugador</p>
                <Select
                  value={playerMode}
                  onValueChange={(v) => {
                    if (!deckSelectDisabled) setPlayerMode(v as any)
                  }}
                  disabled={deckSelectDisabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Modo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="auto">Auto (asistente)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {playerMode === "auto"
                    ? autoStyle === "step"
                      ? "Modo guiado: pulsa Avanzar para ejecutar el siguiente turno."
                      : "Modo continuo: el asistente avanza turnos automáticamente (más lento)."
                    : "Tú decides cada acción (entintar, jugar, quest, challenge)."}
                </p>

                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={tutorialEnabled}
                    onChange={(e) => setTutorialEnabled(e.target.checked)}
                    disabled={deckSelectDisabled}
                  />
                  Tutor interactivo (misiones guiadas)
                </label>

                {playerMode === "auto" && (
                  <div className="grid grid-cols-1 gap-2">
                    <Select
                      value={autoStyle}
                      onValueChange={(v) => {
                        if (!deckSelectDisabled) setAutoStyle(v as any)
                      }}
                      disabled={deckSelectDisabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Estilo auto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="step">Paso a paso (Avanzar)</SelectItem>
                        <SelectItem value="continuous">Continuo (lento)</SelectItem>
                      </SelectContent>
                    </Select>

                    {autoStyle === "continuous" && (
                      <div className="rounded-md border p-2 text-xs text-muted-foreground">
                        Velocidad: {autoDelayMs}ms por turno
                        <div className="mt-2">
                          <input
                            type="range"
                            min={350}
                            max={2000}
                            step={50}
                            value={autoDelayMs}
                            onChange={(e) => setAutoDelayMs(Number(e.target.value))}
                            className="w-full"
                            disabled={deckSelectDisabled}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="md:col-span-3 space-y-2 flex flex-col justify-end">
                {!lockedDeckId ? (
                  <Button onClick={startMatch} disabled={!selectedDeck || loadingData || decks.length === 0 || (remainingDailyGames != null && remainingDailyGames <= 0 && !accessInfo?.isPro)} className="w-full gap-2">
                    <Play className="h-4 w-4" /> Iniciar partida
                  </Button>
                ) : (
                  <Button variant="outline" onClick={resetGame} className="w-full gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Reiniciar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-12">
            <CardHeader>
              <CardTitle>Partida</CardTitle>
              <CardDescription>Tu turno: ink → main (play/quest/challenge) → end.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!game || !uiPlayer || !uiCpu ? (
                <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4">
                  Inicia la partida desde el panel izquierdo.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={game.activePlayer === 0 ? "default" : "secondary"} className="gap-1">
                        <User2 className="h-3 w-3" /> Jugador
                      </Badge>
                      <Badge variant={game.activePlayer === 1 ? "default" : "secondary"} className="gap-1">
                        <Bot className="h-3 w-3" /> CPU
                      </Badge>
                      {cpuThinking && <Badge variant="secondary">CPU…</Badge>}
                      {game.winner !== null && <Badge>Ganador: {game.winner === 0 ? "Jugador" : "CPU"}</Badge>}
                    </div>

                    <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
                      {game.phase === "ink" && game.activePlayer === 0 && (
                        <Button
                          className="w-full sm:w-auto"
                          variant="secondary"
                          onClick={() => playerAction({ type: "SKIP_INK" })}
                        >
                          Saltar tinta
                        </Button>
                      )}
                      {playerMode === "auto" && game.winner === null && (
                        <Button
                          className="w-full sm:w-auto"
                          onClick={advanceAuto}
                          variant="secondary"
                          disabled={cpuThinking}
                        >
                          Avanzar
                        </Button>
                      )}
                      <Button
                        className="w-full sm:w-auto"
                        variant="outline"
                        disabled={game.activePlayer !== 0 || game.phase !== "main" || cpuThinking || game.winner !== null}
                        onClick={() => playerAction({ type: "END_MAIN" })}
                      >
                        Terminar turno
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Siguiente paso:</span> {phaseHint(game.phase)}
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                    Tutor: fase <span className="font-semibold text-foreground">{game.phase}</span> · Ink lista{" "}
                    <span className="font-semibold text-foreground">{playerReadyInk}</span>.
                    {" "}
                    En fase <span className="font-semibold text-foreground">ink</span> puedes entintar 1 carta. En{" "}
                    <span className="font-semibold text-foreground">main</span> solo puedes jugar cartas cuyo coste sea menor o igual a tu ink lista.
                  </div>
                  {tutorialEnabled && (
                    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">Tutorial interactivo</p>
                        <Badge variant="secondary">{tutorialPercent}%</Badge>
                      </div>
                      <div className="h-2 rounded bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${tutorialPercent}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Objetivo actual: <span className="font-medium text-foreground">{tutorialNextLabel}</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {tutorialItems.map((item) => (
                          <div
                            key={item.key}
                            className={[
                              "rounded-md border p-2 text-xs",
                              item.done ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : "text-muted-foreground",
                            ].join(" ")}
                          >
                            {item.done ? "✓" : "•"} {item.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {game.winner !== null && deckCoachInsights.length > 0 && (
                    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Deck Coach (post-partida)</p>
                        <Badge variant="secondary">Top 3</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {deckCoachInsights.map((ins) => (
                          <div
                            key={ins.id}
                            className={[
                              "rounded-md border p-2 text-xs",
                              ins.tone === "good"
                                ? "border-emerald-500/40 bg-emerald-500/10"
                                : ins.tone === "warn"
                                  ? "border-amber-500/40 bg-amber-500/10"
                                  : "border-sky-500/40 bg-sky-500/10",
                            ].join(" ")}
                          >
                            <p className="font-semibold text-foreground">{ins.title}</p>
                            <p className="text-muted-foreground mt-1">{ins.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {banishTray.length > 0 && (
                    <div className="rounded-lg border bg-card p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">Banish (en vivo)</p>
                        <p className="text-xs text-muted-foreground">Cartas recién desterradas</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {banishTray.map((b) => {
                          const def = game.definitions.get(b.definitionId)
                          const card = def ? cardById.get(def.id) : null
                          return (
                            <div
                              key={b.instanceId}
                              className="w-[72px] animate-in fade-in zoom-in duration-200"
                              title={`${b.player === 0 ? "Jugador" : "CPU"}: ${def?.name || "Carta"}`}
                            >
                              <div className="relative aspect-[5/7] w-full overflow-hidden rounded-md border bg-muted">
                                <Image
                                  src={card?.image || "/placeholder.svg"}
                                  alt={def?.name || "Carta"}
                                  fill
                                  className="object-cover"
                                  sizes="72px"
                                  unoptimized={Boolean(card?.image?.startsWith("http"))}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Tu mano</h3>
                        <div className="text-xs text-muted-foreground">{uiPlayer.hand.length} cartas</div>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {uiPlayer.hand.map((instId, idx) => {
                          const inst = game.instances.get(instId)
                          const def = inst ? game.definitions.get(inst.definitionId) : null
                          const card = def ? cardById.get(def.id) : null
                          const cost = typeof def?.inkCost === "number" ? def.inkCost : 0
                          const canPlayByCost = cost <= playerReadyInk
                          const canPlayNow =
                            game.activePlayer === 0 &&
                            !cpuThinking &&
                            game.winner === null &&
                            (game.phase === "main" || game.phase === "ink") &&
                            (game.phase !== "main" || canPlayByCost)
                          const playReason =
                            game.activePlayer !== 0
                              ? "No es tu turno"
                              : cpuThinking
                                ? "La CPU está pensando"
                                : game.winner !== null
                                  ? "La partida terminó"
                                  : game.phase === "main" && !canPlayByCost
                                    ? `No alcanza la tinta: coste ${cost}, disponible ${playerReadyInk}`
                                    : game.phase === "ink"
                                      ? "Al jugar desde ink, se salta tinta automáticamente"
                                      : "Jugar carta"
                          return (
                            <div key={instId} className="rounded-lg border overflow-hidden">
                              <div className="relative aspect-[5/7] w-full bg-muted">
                                <Image
                                  src={card?.image || "/placeholder.svg"}
                                  alt={def?.name || "Carta"}
                                  fill
                                  className="object-cover"
                                  sizes="160px"
                                  unoptimized={Boolean(card?.image?.startsWith("http"))}
                                />
                              </div>
                              <div className="p-2 space-y-2">
                                <div className="text-xs font-semibold line-clamp-2">{def?.name || "Carta"}</div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>Coste: {cost}</span>
                                  {def?.inkable ? <Badge variant="secondary">Inkable</Badge> : <Badge variant="outline">No ink</Badge>}
                                </div>
                                {game.phase === "main" && !canPlayByCost && (
                                  <p className="text-[11px] text-destructive">No alcanza tinta ({playerReadyInk})</p>
                                )}
                                <div className="flex gap-2 pb-0.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 h-8 px-2 text-xs"
                                    disabled={game.activePlayer !== 0 || game.phase !== "ink" || cpuThinking || game.winner !== null}
                                    onClick={() => playerAction({ type: "INK_FROM_HAND", handIndex: idx })}
                                  >
                                    Entintar
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="flex-1 h-8 px-2 text-xs"
                                    disabled={!canPlayNow}
                                    title={playReason}
                                    onClick={() => {
                                      if (!game) return
                                      // UX tutor: si estás en ink y quieres jugar, saltamos tinta y jugamos en secuencia (sin depender de renders).
                                      if (game.phase === "ink") {
                                        runPlayerSequence([
                                          { type: "SKIP_INK" },
                                          { type: "PLAY_FROM_HAND", handIndex: idx },
                                        ])
                                        return
                                      }
                                      runPlayerSequence([{ type: "PLAY_FROM_HAND", handIndex: idx }])
                                    }}
                                  >
                                    Jugar
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Tu inkwell</h3>
                          <div className="text-xs text-muted-foreground">
                            Lista: {uiPlayer.inkwell.filter((c) => !c.exerted).length}/{uiPlayer.inkwell.length}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {uiPlayer.inkwell.map((c) => (
                            <Badge key={c.instanceId} variant={c.exerted ? "outline" : "secondary"}>
                              {c.exerted ? "Exerted" : "Ready"}
                            </Badge>
                          ))}
                          {uiPlayer.inkwell.length === 0 && <div className="text-sm text-muted-foreground">Sin tinta aún.</div>}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Tu mesa</h3>
                          <div className="text-xs text-muted-foreground">{uiPlayer.inPlay.length} en juego</div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                          {uiPlayer.inPlay.map((ipc, idx) => {
                            const def = game.definitions.get(ipc.definitionId)
                            const card = def ? cardById.get(def.id) : null
                            const challengeArmed = pendingChallengeAttacker === idx
                            const hl = highlightInstanceIds[ipc.instanceId]
                            const canQuest =
                              game.activePlayer === 0 &&
                              game.phase === "main" &&
                              !cpuThinking &&
                              game.winner === null &&
                              !ipc.drying &&
                              ipc.ready &&
                              (def?.type === "character" || def?.type === "location") &&
                              typeof def?.lore === "number" &&
                              def.lore > 0
                            const questWhy = ipc.drying
                              ? "Está secando"
                              : !ipc.ready
                                ? "Está exerted"
                                : !(def?.type === "character" || def?.type === "location")
                                  ? "No puede hacer quest"
                                  : !def?.lore
                                    ? "No tiene lore"
                                    : ""

                            const canChallengeBase =
                              game.activePlayer === 0 &&
                              game.phase === "main" &&
                              !cpuThinking &&
                              game.winner === null &&
                              !ipc.drying &&
                              ipc.ready
                            const hasExertedDefender = cpuExertedDefenders.length > 0
                            const dmgPulse = Boolean(damageFlash[ipc.instanceId])
                            return (
                              <div
                                key={ipc.instanceId}
                                ref={(el) => {
                                  inPlayElRef.current[ipc.instanceId] = el
                                }}
                                className={[
                                  "rounded-lg border overflow-hidden transition",
                                  hl === "quest" ? "ring-2 ring-emerald-500" : "",
                                  hl === "challenge" ? "ring-2 ring-amber-500" : "",
                                ].join(" ")}
                              >
                                <div className="relative aspect-[5/7] w-full bg-muted">
                                  <Image
                                    src={card?.image || "/placeholder.svg"}
                                    alt={def?.name || "Carta"}
                                    fill
                                    className="object-cover"
                                    sizes="160px"
                                    unoptimized={Boolean(card?.image?.startsWith("http"))}
                                  />
                                </div>
                                <div className="p-2 space-y-2">
                                  <div className="text-xs font-semibold line-clamp-2">{def?.name || "Carta"}</div>
                                  <div className="flex flex-wrap gap-1">
                                    {ipc.drying && <Badge variant="outline">Secando</Badge>}
                                    {!ipc.ready && <Badge variant="outline">Exerted</Badge>}
                                    {typeof def?.strength === "number" && typeof def?.willpower === "number" && (
                                      <Badge variant="secondary" className={dmgPulse ? "animate-pulse" : ""}>
                                        {def.strength}/{def.willpower} ({ipc.damage})
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      className="flex-1"
                                      disabled={!canQuest}
                                      title={!canQuest ? questWhy || "No es posible ahora" : "Hacer quest"}
                                      onClick={() => playerAction({ type: "QUEST", inPlayIndex: idx })}
                                    >
                                      Quest
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={challengeArmed ? "default" : "outline"}
                                      className="flex-1"
                                      disabled={
                                        !canChallengeBase || uiCpu.inPlay.length === 0 || !hasExertedDefender
                                      }
                                      title={
                                        !canChallengeBase
                                          ? ipc.drying
                                            ? "Está secando"
                                            : !ipc.ready
                                              ? "Está exerted"
                                              : "No es posible ahora"
                                          : !hasExertedDefender
                                            ? "No hay defensores exerted disponibles"
                                            : "Selecciona un defensor exerted y confirma"
                                      }
                                      onClick={() => {
                                        setPendingChallengeAttacker((prev) => (prev === idx ? null : idx))
                                        setPendingChallengeDefender(null)
                                      }}
                                    >
                                      {challengeArmed ? "Elegido" : "Challenge"}
                                    </Button>
                                  </div>

                                  {challengeArmed && (
                                    <div className="space-y-2 rounded-md border p-2 bg-muted/30">
                                      <p className="text-[11px] text-muted-foreground">
                                        Elige un defensor <span className="font-medium text-foreground">exerted</span> de la CPU.
                                      </p>
                                      <Select
                                        value={pendingChallengeDefender === null ? "" : String(pendingChallengeDefender)}
                                        onValueChange={(v) => setPendingChallengeDefender(v ? Number(v) : null)}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue placeholder="Defensor (CPU)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {uiCpu.inPlay.map((cpuCard, cpuIdx) => {
                                            const cpuDef = game.definitions.get(cpuCard.definitionId)
                                            const label = `${cpuDef?.name || "Carta"} ${cpuCard.ready ? "(ready)" : "(exerted)"}`
                                            const disabled = cpuCard.ready // debe estar exerted
                                            return (
                                              <SelectItem key={cpuCard.instanceId} value={String(cpuIdx)} disabled={disabled}>
                                                {label}
                                              </SelectItem>
                                            )
                                          })}
                                        </SelectContent>
                                      </Select>

                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          className="flex-1"
                                          disabled={pendingChallengeDefender === null}
                                          onClick={() => {
                                            if (pendingChallengeDefender === null) return
                                            playerAction({
                                              type: "CHALLENGE",
                                              attackerIndex: idx,
                                              defenderIndex: pendingChallengeDefender,
                                            })
                                            setPendingChallengeAttacker(null)
                                            setPendingChallengeDefender(null)
                                          }}
                                        >
                                          Confirmar challenge
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setPendingChallengeAttacker(null)
                                            setPendingChallengeDefender(null)
                                          }}
                                        >
                                          Cancelar
                                        </Button>
                                      </div>

                                      {uiCpu.inPlay.every((c) => c.ready) && (
                                        <p className="text-[11px] text-muted-foreground">
                                          La CPU no tiene personajes exerted ahora mismo (no hay desafío legal).
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">CPU (para aprender)</h3>
                          <div className="text-xs text-muted-foreground">
                            Inkwell {uiCpu.inkwell.length} · Mesa {uiCpu.inPlay.length} · Descarte {uiCpu.discard.length}
                          </div>
                        </div>

                        <div className="rounded-lg border p-3 space-y-3">
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Inkwell CPU</p>
                            <div className="flex flex-wrap gap-2">
                              {uiCpu.inkwell.map((c) => (
                                <Badge key={c.instanceId} variant={c.exerted ? "outline" : "secondary"}>
                                  {c.exerted ? "Exerted" : "Ready"}
                                </Badge>
                              ))}
                              {uiCpu.inkwell.length === 0 && (
                                <div className="text-sm text-muted-foreground">Sin tinta aún.</div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Mesa CPU</p>
                            {uiCpu.inPlay.length === 0 ? (
                              <div className="text-sm text-muted-foreground">Sin cartas en juego.</div>
                            ) : (
                              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                {uiCpu.inPlay.map((ipc) => {
                                  const def = game.definitions.get(ipc.definitionId)
                                  const card = def ? cardById.get(def.id) : null
                                  const hl = highlightInstanceIds[ipc.instanceId]
                                  const dmgPulse = Boolean(damageFlash[ipc.instanceId])
                                  return (
                                    <div
                                      key={ipc.instanceId}
                                      className={[
                                        "rounded-lg border overflow-hidden transition",
                                        hl === "challenge" ? "ring-2 ring-amber-500" : "",
                                      ].join(" ")}
                                    >
                                      <div className="relative aspect-[5/7] w-full bg-muted">
                                        <Image
                                          src={card?.image || "/placeholder.svg"}
                                          alt={def?.name || "Carta"}
                                          fill
                                          className="object-cover"
                                          sizes="160px"
                                          unoptimized={Boolean(card?.image?.startsWith("http"))}
                                        />
                                      </div>
                                      <div className="p-2 space-y-1">
                                        <div className="text-xs font-semibold line-clamp-2">{def?.name || "Carta"}</div>
                                        <div className="flex flex-wrap gap-1">
                                          {ipc.drying && <Badge variant="outline">Secando</Badge>}
                                          {!ipc.ready && <Badge variant="outline">Exerted</Badge>}
                                          {typeof def?.strength === "number" && typeof def?.willpower === "number" && (
                                            <Badge variant="secondary" className={dmgPulse ? "animate-pulse" : ""}>
                                              {def.strength}/{def.willpower} ({ipc.damage})
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Descarte CPU</p>
                            {uiCpu.discard.length === 0 ? (
                              <div className="text-sm text-muted-foreground">Vacío.</div>
                            ) : (
                              <div
                                ref={(el) => {
                                  discardCpuElRef.current = el
                                }}
                                className={["flex gap-2 flex-wrap", discardPulse.cpu ? "animate-pulse" : ""].join(" ")}
                              >
                                {uiCpu.discard.slice(-6).reverse().map((instId) => {
                                  const inst = game.instances.get(instId)
                                  const def = inst ? game.definitions.get(inst.definitionId) : null
                                  const card = def ? cardById.get(def.id) : null
                                  return (
                                    <div key={instId} className="w-[56px]" title={def?.name || "Carta"}>
                                      <div className="relative aspect-[5/7] w-full overflow-hidden rounded-md border bg-muted">
                                        <Image
                                          src={card?.image || "/placeholder.svg"}
                                          alt={def?.name || "Carta"}
                                          fill
                                          className="object-cover"
                                          sizes="56px"
                                          unoptimized={Boolean(card?.image?.startsWith("http"))}
                                        />
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Tu descarte</h3>
                      <div className="text-xs text-muted-foreground">{uiPlayer.discard.length} cartas</div>
                    </div>
                    {uiPlayer.discard.length === 0 ? (
                      <div className="text-sm text-muted-foreground">Vacío.</div>
                    ) : (
                      <div
                        ref={(el) => {
                          discardPlayerElRef.current = el
                        }}
                        className={["flex gap-2 flex-wrap", discardPulse.player ? "animate-pulse" : ""].join(" ")}
                      >
                        {uiPlayer.discard.slice(-6).reverse().map((instId) => {
                          const inst = game.instances.get(instId)
                          const def = inst ? game.definitions.get(inst.definitionId) : null
                          const card = def ? cardById.get(def.id) : null
                          return (
                            <div key={instId} className="w-[56px]" title={def?.name || "Carta"}>
                              <div className="relative aspect-[5/7] w-full overflow-hidden rounded-md border bg-muted">
                                <Image
                                  src={card?.image || "/placeholder.svg"}
                                  alt={def?.name || "Carta"}
                                  fill
                                  className="object-cover"
                                  sizes="56px"
                                  unoptimized={Boolean(card?.image?.startsWith("http"))}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold">Registro (eventos del motor)</h3>
                    <div className="max-h-64 overflow-auto rounded-lg border p-3 text-sm space-y-1">
                      {events.length === 0 ? (
                        <div className="text-muted-foreground">Sin eventos.</div>
                      ) : (
                        [...events]
                          .slice(-50)
                          .reverse()
                          .map((e, i) => (
                            <button
                              key={i}
                              type="button"
                              className="w-full text-left rounded px-2 py-1 hover:bg-muted/50 transition text-muted-foreground"
                              onClick={() => {
                                const ids = extractInstanceIds(e)
                                if (ids.length === 0) return
                                const first = ids[0]
                                const el = inPlayElRef.current[first]
                                if (el) {
                                  el.scrollIntoView({ behavior: "smooth", block: "center" })
                                }
                                const mark: Record<string, "quest" | "challenge" | "banish"> = {}
                                for (const id of ids) {
                                  mark[id] = e.type === "QUEST_LORE" ? "quest" : e.type === "CARD_BANISHED" ? "banish" : "challenge"
                                }
                                setHighlightInstanceIds((prev) => ({ ...prev, ...mark }))
                                window.setTimeout(() => {
                                  setHighlightInstanceIds((prev) => {
                                    const copy = { ...prev }
                                    for (const k of Object.keys(mark)) delete copy[k]
                                    return copy
                                  })
                                }, 900)
                              }}
                            >
                              <span className="font-medium text-foreground">{formatEvent(e)}</span>
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}


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
import { Bot, Lock, Play, RotateCcw, Sword, User2 } from "lucide-react"

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

export default function PlayVsCpuPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading } = useUser()

  const [decks, setDecks] = useState<DeckForGame[]>([])
  const [allCards, setAllCards] = useState<CatalogCard[]>([])
  const [selectedDeckId, setSelectedDeckId] = useState<string>("")
  const [loadingData, setLoadingData] = useState(false)

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

  const cpuExertedDefenders = useMemo(() => {
    if (!uiCpu) return []
    return uiCpu.inPlay.map((c, idx) => ({ c, idx })).filter((x) => !x.c.ready)
  }, [uiCpu])

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

        const [decksRes, cardsRes] = await Promise.all([
          fetch("/api/decks", { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/cards?t=${Date.now()}`, { cache: "no-store" }),
        ])

        const decksJson = await decksRes.json()
        const cardsJson = await cardsRes.json()

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
    processedEventCountRef.current = 0
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

    setLockedDeckId(deck.id)
    setGame(started.state)
    setEvents(started.events)
    setEngineTurns([{ index: 1, actor: "system", action: { type: "SKIP_INK" } as any, events: started.events }])
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
      if (!game) return
      if (game.winner !== null) return
      if (game.activePlayer !== 0) return
      if (cpuThinking) return

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

  const playerAction = useCallback(
    (action: GameAction) => {
      if (!game) return
      if (game.winner !== null) return
      if (game.activePlayer !== 0) return
      if (cpuThinking) return
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

    setCpuThinking(true)
    try {
      let s: GameState = game
      for (let guard = 0; guard < 30; guard++) {
        if (cpuAbortRef.current) return
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
  }, [applyAndLog, cpuThinking, game])

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
        if (!json.success) throw new Error(json.error || "No se pudo guardar el replay")
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sword className="h-4 w-4" /> Configuración
              </CardTitle>
              <CardDescription>Elige mazo y pulsa iniciar. El mazo queda fijado hasta reiniciar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
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
              </div>

              {selectedDeck && (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">{selectedDeck.name}</span>
                  </p>
                  <p>{selectedDeck.cards.length} cartas únicas</p>
                  <p>{selectedDeck.cards.reduce((acc, c) => acc + c.quantity, 0)} cartas totales</p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {!lockedDeckId ? (
                  <Button
                    onClick={startMatch}
                    disabled={!selectedDeck || loadingData || decks.length === 0}
                    className="w-full gap-2"
                  >
                    <Play className="h-4 w-4" /> Iniciar partida
                  </Button>
                ) : (
                  <Button variant="outline" onClick={resetGame} className="w-full gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Reiniciar
                  </Button>
                )}
              </div>

              {game && uiPlayer && uiCpu && (
                <div className="rounded-lg border p-3 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Fase</span>
                    <span className="font-semibold">{game.phase}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Turno de</span>
                    <span className="font-semibold">{game.activePlayer === 0 ? "Jugador" : "CPU"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Lore</span>
                    <span className="font-semibold">
                      {uiPlayer.lore} - {uiCpu.lore}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tinta lista</span>
                    <span className="font-semibold">
                      {uiPlayer.inkwell.filter((c) => !c.exerted).length} / {uiPlayer.inkwell.length}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
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
                                  <span>Coste: {def?.inkCost ?? "?"}</span>
                                  {def?.inkable ? <Badge variant="secondary">Inkable</Badge> : <Badge variant="outline">No ink</Badge>}
                                </div>
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
                                    disabled={game.activePlayer !== 0 || cpuThinking || game.winner !== null}
                                    title={
                                      game.activePlayer !== 0
                                        ? "No es tu turno"
                                        : cpuThinking
                                          ? "Espera a la CPU"
                                          : game.winner !== null
                                            ? "La partida terminó"
                                            : game.phase === "ink"
                                              ? "Si no quieres entintar, puedes jugar igual (saltando tinta automáticamente)"
                                              : "Jugar carta"
                                    }
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


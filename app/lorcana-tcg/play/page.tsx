"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
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
import type { Card as CardType } from "@/lib/types"
import type { DeckRow } from "@/lib/deck-hydration"
import { Sword, Play, RotateCcw, Bot, User2, Lock } from "lucide-react"

type BattleTurn = {
  turn: number
  action: "play" | "pass" | "illegal_attempt"
  isLegal: boolean
  reason?: string | null
  inkBefore: number
  inkCost: number
  inkUsed: number
  playerCardName: string
  playerCardId: string
  playerLore: number
  cpuCardName: string
  cpuCardId: string
  cpuLore: number
}

type DeckForGame = {
  id: string
  name: string
  cards: Array<{ cardId: string; quantity: number }>
}

type GameMode = "manual" | "auto"

const LORE_TARGET = 20
const HAND_SIZE = 5
const MAX_INK = 10

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Construye el mazo de 60 (o lo que haya) como lista de cartas del catálogo */
function buildLibraryFromDeck(allCards: CardType[], deck: DeckForGame): CardType[] {
  const pool: CardType[] = []
  const byId = new Map(allCards.map((c) => [String(c.id).toLowerCase().trim(), c]))

  for (const row of deck.cards) {
    const c = byId.get(String(row.cardId).toLowerCase().trim())
    if (!c) continue
    const qty = Math.max(1, Math.min(4, Number(row.quantity || 1)))
    for (let i = 0; i < qty; i++) pool.push({ ...c })
  }

  if (pool.length === 0) {
    return [
      {
        id: "fallback",
        name: "Carta genérica",
        image: "/placeholder.svg",
        price: 0,
        foilPrice: 0,
        productType: "card" as const,
        set: "unknown",
        rarity: "common" as const,
        type: "character" as const,
        number: 0,
        lore: 1,
      },
    ]
  }

  return shuffle(pool)
}

function loreFromCard(card: CardType): number {
  const lore = typeof card.lore === "number" && card.lore > 0 ? card.lore : 1
  return Math.max(1, Math.min(5, lore))
}

function inkCostFromCard(card: CardType): number {
  const raw = typeof card.inkCost === "number" ? card.inkCost : card.inkCost ? Number(card.inkCost) : 0
  if (Number.isNaN(raw)) return 0
  return Math.max(0, Math.floor(raw))
}

function drawFromLibrary(lib: CardType[], hand: CardType[], n: number): { lib: CardType[]; hand: CardType[] } {
  let l = [...lib]
  let h = [...hand]
  for (let i = 0; i < n && l.length > 0; i++) {
    h.push(l[0])
    l = l.slice(1)
  }
  return { lib: l, hand: h }
}

export default function PlayVsCpuPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading } = useUser()

  const [decks, setDecks] = useState<DeckForGame[]>([])
  const [allCards, setAllCards] = useState<CardType[]>([])
  const [selectedDeckId, setSelectedDeckId] = useState<string>("")
  const [gameMode, setGameMode] = useState<GameMode>("manual")
  const [lockedMode, setLockedMode] = useState<GameMode | null>(null)
  const [loadingData, setLoadingData] = useState(false)

  /** Mazo fijado al iniciar partida; no se puede cambiar hasta reiniciar */
  const [lockedDeckId, setLockedDeckId] = useState<string | null>(null)
  const [playerLibrary, setPlayerLibrary] = useState<CardType[]>([])
  const [cpuLibrary, setCpuLibrary] = useState<CardType[]>([])
  const [playerHand, setPlayerHand] = useState<CardType[]>([])

  const [playerLore, setPlayerLore] = useState(0)
  const [cpuLore, setCpuLore] = useState(0)
  const [turn, setTurn] = useState(0)
  const [inkAvailable, setInkAvailable] = useState(1)
  const [battleLog, setBattleLog] = useState<BattleTurn[]>([])
  const [winner, setWinner] = useState<"player" | "cpu" | null>(null)

  const [turnAnimating, setTurnAnimating] = useState(false)
  const cpuFlipTimeoutRef = useRef<number | null>(null)

  /** Visual: cartas “en mesa” (jugador cara arriba y CPU voltea) */
  const [mesaPlayerCard, setMesaPlayerCard] = useState<CardType | null>(null)
  const [mesaCpuCard, setMesaCpuCard] = useState<CardType | null>(null)
  const [mesaCpuFaceUp, setMesaCpuFaceUp] = useState(false)
  const [mesaPlayerLoreGain, setMesaPlayerLoreGain] = useState(0)
  const [mesaCpuLoreGain, setMesaCpuLoreGain] = useState(0)

  /** Persistencia del replay */
  const [savingGame, setSavingGame] = useState(false)
  const [savedGameId, setSavedGameId] = useState<string | null>(null)
  const savedGameAttemptedRef = useRef(false)

  const selectedDeck = useMemo(
    () => decks.find((d) => d.id === (lockedDeckId || selectedDeckId)) || null,
    [decks, selectedDeckId, lockedDeckId]
  )

  const matchEnded = lockedDeckId !== null && winner !== null

  const effectiveDeckId = lockedDeckId ?? selectedDeckId
  const effectiveMode = lockedMode ?? gameMode

  useEffect(() => {
    if (!loading && !user) {
      router.push("/lorcana-tcg/login")
    }
  }, [loading, user, router])

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
          fetch("/api/decks", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/cards?t=${Date.now()}`, { cache: "no-store" }),
        ])

        const decksJson = await decksRes.json()
        const cardsJson = await cardsRes.json()

        if (!decksJson.success) throw new Error(decksJson.error || "No se pudieron cargar mazos")
        if (!cardsJson.success) throw new Error(cardsJson.error || "No se pudo cargar catálogo")

        const loadedDecks = (decksJson.data || []) as DeckRow[]
        if (!cancelled) {
          setDecks(
            loadedDecks.map((d) => ({
              id: d.id,
              name: d.name,
              cards: d.cards,
            }))
          )
          setAllCards(cardsJson.data || [])
          if (loadedDecks.length > 0) {
            setSelectedDeckId((prev) => prev || loadedDecks[0].id)
          }
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
  }, [user?.id, toast])

  useEffect(() => {
    return () => {
      if (cpuFlipTimeoutRef.current) {
        window.clearTimeout(cpuFlipTimeoutRef.current)
        cpuFlipTimeoutRef.current = null
      }
    }
  }, [])

  const resetGame = useCallback(() => {
    setLockedDeckId(null)
    setLockedMode(null)
    savedGameAttemptedRef.current = false
    setSavedGameId(null)
    setSavingGame(false)
    setPlayerLibrary([])
    setCpuLibrary([])
    setPlayerHand([])
    setPlayerLore(0)
    setCpuLore(0)
    setTurn(0)
    setInkAvailable(1)
    setBattleLog([])
    setWinner(null)

    setTurnAnimating(false)
    if (cpuFlipTimeoutRef.current) {
      window.clearTimeout(cpuFlipTimeoutRef.current)
      cpuFlipTimeoutRef.current = null
    }
    setMesaPlayerCard(null)
    setMesaCpuCard(null)
    setMesaCpuFaceUp(false)
    setMesaPlayerLoreGain(0)
    setMesaCpuLoreGain(0)
  }, [])

  const startMatch = () => {
    const deck = decks.find((d) => d.id === selectedDeckId)
    if (!deck || winner) return

    const pLib = buildLibraryFromDeck(allCards, deck)
    const cLib = buildLibraryFromDeck(allCards, deck)

    const dealtP = drawFromLibrary(pLib, [], HAND_SIZE)
    const dealtC = drawFromLibrary(cLib, [], HAND_SIZE)

    setLockedDeckId(deck.id)
    setLockedMode(gameMode)
    setPlayerLibrary(dealtP.lib)
    setCpuLibrary(dealtC.lib)
    setPlayerHand(dealtP.hand)
    setPlayerLore(0)
    setCpuLore(0)
    setTurn(0)
    setInkAvailable(1)
    setBattleLog([])
    setWinner(null)

    toast({
      title: "Partida iniciada",
      description:
        effectiveMode === "manual"
          ? "Elige una carta de tu mano para jugar. El mazo queda fijado hasta reiniciar."
          : "Modo automático activo: podrás jugar turnos automáticos con una carta al azar.",
    })
  }

  const playCardFromHand = (handIndex: number) => {
    if (!lockedDeckId || winner !== null) return
    if (turnAnimating || savingGame) return
    if (handIndex < 0 || handIndex >= playerHand.length) return

    const deck = decks.find((d) => d.id === lockedDeckId)
    if (!deck) return

    const playerCard = playerHand[handIndex]
    const playerInkCost = inkCostFromCard(playerCard)
    const legal = playerInkCost <= inkAvailable
    const reason = legal
      ? null
      : `Jugada inválida: esta carta cuesta ${playerInkCost} ink, pero tienes ${inkAvailable}.`

    // Tutor: no permitimos jugar cartas ilegales (pero sí registramos el intento).
    if (!legal) {
      const illegalEntry: BattleTurn = {
        turn: turn + 1,
        action: "illegal_attempt",
        isLegal: false,
        reason,
        inkBefore: inkAvailable,
        inkCost: playerInkCost,
        inkUsed: 0,
        playerCardName: playerCard.name,
        playerCardId: String(playerCard.id),
        playerLore: 0,
        cpuCardName: "—",
        cpuCardId: "",
        cpuLore: 0,
      }

      setBattleLog((prev) => [illegalEntry, ...prev])
      toast({ title: "Carta ilegal", description: reason || "No es legal", variant: "destructive" })
      return
    }

    // Legal play
    const playerGain = loreFromCard(playerCard)

    let newHand = playerHand.filter((_, i) => i !== handIndex)
    let newLib = [...playerLibrary]
    if (newLib.length > 0) {
      newHand.push(newLib[0])
      newLib = newLib.slice(1)
    }
    setPlayerHand(newHand)
    setPlayerLibrary(newLib)

    let cpuCard: CardType
    let cpuGain = 0
    let newCpuLib = [...cpuLibrary]
    if (newCpuLib.length > 0) {
      cpuCard = newCpuLib[0]
      newCpuLib = newCpuLib.slice(1)
      cpuGain = loreFromCard(cpuCard)
    } else {
      cpuCard = {
        id: "cpu-empty",
        name: "Mazo agotado",
        image: "",
        price: 0,
        foilPrice: 0,
        productType: "card",
        set: "unknown",
        rarity: "common",
        type: "character",
        number: 0,
        lore: 0,
      }
    }
    setCpuLibrary(newCpuLib)

    // Visual: jugador en mesa, CPU boca abajo y luego volteamos
    setMesaPlayerCard(playerCard)
    setMesaPlayerLoreGain(playerGain)
    setMesaCpuCard(cpuCard)
    setMesaCpuLoreGain(cpuGain)
    setMesaCpuFaceUp(false)
    setTurnAnimating(true)
    if (cpuFlipTimeoutRef.current) {
      window.clearTimeout(cpuFlipTimeoutRef.current)
      cpuFlipTimeoutRef.current = null
    }
    cpuFlipTimeoutRef.current = window.setTimeout(() => {
      setMesaCpuFaceUp(true)
      setTurnAnimating(false)
    }, 650)

    const nextTurn = turn + 1
    const nextPlayerLore = playerLore + playerGain
    const nextCpuLore = cpuLore + cpuGain

    const inkAfterSpend = inkAvailable - playerInkCost
    const nextInk = Math.min(MAX_INK, inkAfterSpend + 1) // ganamos 1 ink al pasar al siguiente turno
    setInkAvailable(nextInk)

    const nextTurnEntry: BattleTurn = {
      turn: nextTurn,
      action: "play",
      isLegal: true,
      reason: null,
      inkBefore: inkAvailable,
      inkCost: playerInkCost,
      inkUsed: playerInkCost,
      playerCardName: playerCard.name,
      playerCardId: String(playerCard.id),
      playerLore: playerGain,
      cpuCardName: cpuCard.name,
      cpuCardId: String(cpuCard.id),
      cpuLore: cpuGain,
    }

    const nextBattleLog = [nextTurnEntry, ...battleLog]

    setTurn(nextTurn)
    setPlayerLore(nextPlayerLore)
    setCpuLore(nextCpuLore)
    setBattleLog(nextBattleLog)

    // Guardar replay: solo cuando hay un resultado final
    if (nextPlayerLore >= LORE_TARGET || nextCpuLore >= LORE_TARGET) {
      const finalWinner = nextPlayerLore >= nextCpuLore ? "player" : "cpu"
      setWinner(finalWinner)
      toast({
        title: finalWinner === "player" ? "Ganaste" : "Perdiste",
        description:
          finalWinner === "player"
            ? "Buen duelo. Reinicia para jugar otra partida."
            : "La CPU ganó esta ronda. Prueba otro mazo o vuelve a intentarlo.",
      })

      if (!savedGameAttemptedRef.current && lockedDeckId) {
        savedGameAttemptedRef.current = true
        void (async () => {
          try {
            setSavingGame(true)
            const session = await supabase.auth.getSession()
            const token = session.data.session?.access_token
            if (!token) throw new Error("No hay sesión activa")

            const res = await fetch("/api/games/vs-cpu/finish", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                deckId: lockedDeckId,
                deckName: deck.name,
                mode: effectiveMode,
                result: finalWinner,
                turns: [...nextBattleLog].reverse().map((t) => ({
                  turnIndex: t.turn,
                  action: t.action,
                  isLegal: t.isLegal,
                  reason: t.reason ?? null,
                  inkBefore: t.inkBefore,
                  inkCost: t.inkCost,
                  inkUsed: t.inkUsed,
                  playerCardId: t.playerCardId || null,
                  playerCardName: t.playerCardName || null,
                  playerLoreGain: t.playerLore,
                  cpuCardId: t.cpuCardId || null,
                  cpuCardName: t.cpuCardName || null,
                  cpuLoreGain: t.cpuLore,
                })),
              }),
            })

            const json = await res.json()
            if (!json.success) throw new Error(json.error || "No se pudo guardar la partida")
            setSavedGameId(json.data.id)
            toast({
              title: "Partida guardada",
              description: "Ahora puedes ver el replay en tu historial.",
            })
          } catch (e) {
            console.error(e)
            toast({
              title: "Error al guardar",
              description: e instanceof Error ? e.message : "No se pudo guardar el replay",
              variant: "destructive",
            })
          } finally {
            setSavingGame(false)
          }
        })()
      }
    } else if (newHand.length === 0 && newLib.length === 0) {
      const finalWinner = nextPlayerLore >= nextCpuLore ? "player" : "cpu"
      setWinner(finalWinner)
      toast({
        title: "Sin cartas",
        description:
          finalWinner === "player"
            ? "Te quedaste sin cartas con más lore. ¡Victoria por lore!"
            : "Fin del mazo. Gana quien tenga más lore.",
      })

      if (!savedGameAttemptedRef.current && lockedDeckId) {
        savedGameAttemptedRef.current = true
        void (async () => {
          try {
            setSavingGame(true)
            const session = await supabase.auth.getSession()
            const token = session.data.session?.access_token
            if (!token) throw new Error("No hay sesión activa")

            const res = await fetch("/api/games/vs-cpu/finish", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                deckId: lockedDeckId,
                deckName: deck.name,
                mode: effectiveMode,
                result: finalWinner,
                turns: [...nextBattleLog].reverse().map((t) => ({
                  turnIndex: t.turn,
                  action: t.action,
                  isLegal: t.isLegal,
                  reason: t.reason ?? null,
                  inkBefore: t.inkBefore,
                  inkCost: t.inkCost,
                  inkUsed: t.inkUsed,
                  playerCardId: t.playerCardId || null,
                  playerCardName: t.playerCardName || null,
                  playerLoreGain: t.playerLore,
                  cpuCardId: t.cpuCardId || null,
                  cpuCardName: t.cpuCardName || null,
                  cpuLoreGain: t.cpuLore,
                })),
              }),
            })

            const json = await res.json()
            if (!json.success) throw new Error(json.error || "No se pudo guardar la partida")
            setSavedGameId(json.data.id)
            toast({
              title: "Partida guardada",
              description: "Ahora puedes ver el replay en tu historial.",
            })
          } catch (e) {
            console.error(e)
            toast({
              title: "Error al guardar",
              description: e instanceof Error ? e.message : "No se pudo guardar el replay",
              variant: "destructive",
            })
          } finally {
            setSavingGame(false)
          }
        })()
      }
    }
  }

  const passTurn = () => {
    if (!lockedDeckId || winner !== null) return
    if (turnAnimating || savingGame) return

    const nextTurn = turn + 1
    const nextInk = Math.min(MAX_INK, inkAvailable + 1)
    setInkAvailable(nextInk)
    setTurn(nextTurn)

    // Limpieza visual del “último turno” al pasar
    setMesaPlayerCard(null)
    setMesaCpuCard(null)
    setMesaCpuFaceUp(false)

    const passEntry: BattleTurn = {
      turn: nextTurn,
      action: "pass",
      isLegal: true,
      reason: null,
      inkBefore: inkAvailable,
      inkCost: 0,
      inkUsed: 0,
      playerCardName: "—",
      playerCardId: "",
      playerLore: 0,
      cpuCardName: "—",
      cpuCardId: "",
      cpuLore: 0,
    }

    setBattleLog((prev) => [passEntry, ...prev])
  }

  const playAutoTurn = () => {
    if (effectiveMode !== "auto" || playerHand.length === 0 || winner !== null) return
    const legalIndices: number[] = []
    for (let i = 0; i < playerHand.length; i++) {
      const cost = inkCostFromCard(playerHand[i])
      if (cost <= inkAvailable) legalIndices.push(i)
    }

    if (legalIndices.length === 0) {
      passTurn()
      return
    }

    const randomIndex = legalIndices[Math.floor(Math.random() * legalIndices.length)]
    playCardFromHand(randomIndex)
  }

  if (loading || !user) return null

  const deckSelectDisabled = lockedDeckId !== null

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-black">Jugar vs CPU</h1>
            <p className="text-muted-foreground mt-1">
              Dos modos: manual (eliges carta) o automático (juega carta al azar). El mazo se fija al iniciar.
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
              <CardDescription>
                Elige mazo y pulsa <strong>Iniciar partida</strong>. Mientras juegas no podrás cambiar de mazo.
              </CardDescription>
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

              <div className="space-y-2">
                <p className="text-sm font-medium">Modo</p>
                <Select
                  value={effectiveMode}
                  onValueChange={(v) => {
                    if (!deckSelectDisabled) setGameMode(v as GameMode)
                  }}
                  disabled={deckSelectDisabled || loadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona modo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual (yo elijo carta)</SelectItem>
                    <SelectItem value="auto">Automático (elige al azar)</SelectItem>
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
                    {matchEnded ? "Nueva partida (elegir mazo)" : "Abandonar y reiniciar"}
                  </Button>
                )}
              </div>

              {lockedDeckId && !matchEnded && (
                <p className="text-xs text-muted-foreground">
                  {effectiveMode === "manual"
                    ? "Tutor MVP: solo puedes jugar cartas con inkCost <= Ink disponible. Si una carta es ilegal, no se juega (pero se registra)."
                    : "Tutor MVP (auto): elige una carta legal (inkCost <= Ink disponible). Si no hay legales, pasas turno."}
                </p>
              )}

              {decks.length === 0 && !loadingData && (
                <p className="text-xs text-muted-foreground">
                  No tienes mazos guardados todavía. Crea uno en Mis Mazos para jugar.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Partida</CardTitle>
              <CardDescription>Objetivo: llegar a {LORE_TARGET} lore primero.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Mesa (visual del último turno) */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <p className="font-medium">Mesa</p>
                  {turnAnimating && (
                    <Badge variant="secondary" className="gap-1">
                      Resolviendo turno…
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Tu carta</p>
                    {mesaPlayerCard ? (
                      <div className="rounded-lg border bg-card p-2">
                        <div className="relative aspect-[5/7] w-full overflow-hidden rounded-md bg-muted mb-2">
                          {mesaPlayerCard.image && String(mesaPlayerCard.image).trim() !== "" ? (
                            <Image
                              src={mesaPlayerCard.image}
                              alt={mesaPlayerCard.name}
                              fill
                              className="object-cover"
                              sizes="240px"
                              unoptimized={mesaPlayerCard.image.startsWith("http")}
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-muted-foreground px-2 text-center">
                              {mesaPlayerCard.name}
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-medium line-clamp-2">{mesaPlayerCard.name}</p>
                        <p className="text-[10px] text-muted-foreground">Lore +{mesaPlayerLoreGain}</p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        Juega tu primera carta para verla aquí.
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Carta CPU</p>
                    {mesaCpuCard ? (
                      <div className="rounded-lg border bg-card p-2">
                        <div className="relative aspect-[5/7] w-full overflow-hidden rounded-md bg-muted mb-2">
                          {mesaCpuFaceUp ? (
                            mesaCpuCard.image && String(mesaCpuCard.image).trim() !== "" ? (
                              <Image
                                src={mesaCpuCard.image}
                                alt={mesaCpuCard.name}
                                fill
                                className="object-cover"
                                sizes="240px"
                                unoptimized={mesaCpuCard.image.startsWith("http")}
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-muted-foreground px-2 text-center">
                                {mesaCpuCard.name}
                              </div>
                            )
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/20 to-background/40 flex items-center justify-center text-sm font-semibold text-primary">
                              CPU
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-medium line-clamp-2">
                          {mesaCpuFaceUp ? mesaCpuCard.name : "Carta boca abajo"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {mesaCpuFaceUp ? `Lore +${mesaCpuLoreGain}` : "Se voltea en automático"}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        La CPU mostrará su carta al jugar.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User2 className="h-4 w-4" />
                      <span className="font-medium">Tu lore</span>
                    </div>
                    <Badge>{playerLore}</Badge>
                  </div>
                  <div className="h-2 rounded bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, (playerLore / LORE_TARGET) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      <span className="font-medium">CPU lore</span>
                    </div>
                    <Badge variant="secondary">{cpuLore}</Badge>
                  </div>
                  <div className="h-2 rounded bg-muted overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all"
                      style={{ width: `${Math.min(100, (cpuLore / LORE_TARGET) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-muted-foreground">Turno: {turn}</p>
                  <Badge variant="secondary">Ink: {inkAvailable}/{MAX_INK}</Badge>
                </div>
                {lockedDeckId && (
                  <p className="text-xs text-muted-foreground">
                    Tu mazo: {playerLibrary.length} en biblioteca · Mano: {playerHand.length}
                  </p>
                )}
                {winner && (
                  <Badge variant={winner === "player" ? "default" : "destructive"}>
                    {winner === "player" ? "Victoria" : "Derrota"}
                  </Badge>
                )}
                {winner && savedGameId && (
                  <Link href="/lorcana-tcg/my-games">
                    <Button variant="secondary" size="sm">
                      Ver replay
                    </Button>
                  </Link>
                )}
              </div>

              {lockedDeckId && !winner && effectiveMode === "auto" && (
                <div className="space-y-2">
                  <Button
                    onClick={playAutoTurn}
                    className="gap-2"
                    disabled={turnAnimating || savingGame}
                  >
                    <Play className="h-4 w-4" /> Jugar turno automático
                  </Button>
                </div>
              )}

              {lockedDeckId && !winner && effectiveMode === "manual" && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={passTurn}
                    disabled={turnAnimating || savingGame}
                    className="w-full gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Pasar turno
                  </Button>
                </div>
              )}

              {/* Mano del jugador */}
              {lockedDeckId && !winner && effectiveMode === "manual" && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Tu mano — elige una carta para jugar</p>
                  {playerHand.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tienes cartas en mano.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {playerHand.map((c, idx) => (
                        <button
                          key={`${c.id}-${idx}`}
                          type="button"
                          onClick={() => playCardFromHand(idx)}
                          disabled={turnAnimating || savingGame || winner !== null}
                          aria-disabled={turnAnimating || savingGame || winner !== null}
                          className={`rounded-lg border bg-card p-2 text-left transition hover:border-primary hover:ring-1 hover:ring-primary/30 focus:outline-none focus:ring-2 focus:ring-primary ${
                            inkCostFromCard(c) > inkAvailable ? "border-destructive/60 bg-destructive/10" : ""
                          }`}
                        >
                          <div className="relative aspect-[5/7] w-full overflow-hidden rounded-md bg-muted mb-2">
                            {c.image && String(c.image).trim() !== "" ? (
                              <Image
                                src={c.image}
                                alt={c.name}
                                fill
                                className="object-cover"
                                sizes="120px"
                                unoptimized={c.image.startsWith("http")}
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-muted-foreground px-1 text-center">
                                {c.name}
                              </div>
                            )}
                          </div>
                          <p className="text-xs font-medium line-clamp-2">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground">Lore +{loreFromCard(c)}</p>
                          <p
                            className={`text-[10px] ${
                              inkCostFromCard(c) > inkAvailable ? "text-destructive" : "text-muted-foreground"
                            }`}
                          >
                            Ink costo {inkCostFromCard(c)} / {inkAvailable}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!lockedDeckId && (
                <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4">
                  Inicia la partida desde el panel izquierdo. Luego juegas en modo manual o automático.
                </p>
              )}

              <div className="rounded-lg border">
                <div className="p-3 border-b">
                  <p className="font-medium">Registro de turnos</p>
                </div>
                <div className="max-h-80 overflow-y-auto p-3 space-y-2">
                  {battleLog.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {lockedDeckId
                        ? effectiveMode === "manual"
                          ? "Toca una carta de tu mano para el primer turno."
                          : 'Pulsa "Jugar turno automático".'
                        : 'Aún no hay turnos. Pulsa "Iniciar partida".'}
                    </p>
                  )}
                  {battleLog.map((item) => (
                    <div key={item.turn} className="rounded border p-2 text-sm">
                      <p className="font-medium">Turno {item.turn}</p>
                      {item.action === "illegal_attempt" ? (
                        <p className="text-destructive font-medium">Incorrecto</p>
                      ) : item.action === "pass" ? (
                        <p className="text-muted-foreground font-medium">Pasó</p>
                      ) : (
                        <p className="text-foreground font-medium">Correcto</p>
                      )}

                      <p>Tu carta: {item.playerCardName}</p>
                      {item.action === "play" && (
                        <p className="text-xs text-muted-foreground">
                          +{item.playerLore} lore (jugador)
                        </p>
                      )}

                      <p>CPU: {item.cpuCardName}</p>
                      {item.action === "play" && (
                        <p className="text-xs text-muted-foreground">
                          +{item.cpuLore} lore (CPU)
                        </p>
                      )}

                      <p className="text-[11px] text-muted-foreground mt-1">
                        Ink: {item.inkCost} costo · {item.inkUsed} usado (tenías {item.inkBefore})
                      </p>

                      {item.action === "illegal_attempt" && item.reason && (
                        <p className="text-xs text-destructive mt-1">{item.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}

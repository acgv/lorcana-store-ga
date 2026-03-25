"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { Sword, Play, RotateCcw, Bot, User2 } from "lucide-react"

type BattleTurn = {
  turn: number
  playerCardName: string
  playerLore: number
  cpuCardName: string
  cpuLore: number
}

type DeckForGame = {
  id: string
  name: string
  cards: Array<{ cardId: string; quantity: number }>
}

const LORE_TARGET = 20

function drawCard(cards: CardType[], deck: DeckForGame): CardType {
  const pool: CardType[] = []
  const byId = new Map(cards.map((c) => [String(c.id).toLowerCase().trim(), c]))

  for (const row of deck.cards) {
    const c = byId.get(String(row.cardId).toLowerCase().trim())
    if (!c) continue
    const qty = Math.max(1, Math.min(4, Number(row.quantity || 1)))
    for (let i = 0; i < qty; i++) pool.push(c)
  }

  if (pool.length === 0) {
    return {
      id: "fallback-card",
      name: "Carta Genérica",
      image: "/placeholder.svg",
      price: 0,
      foilPrice: 0,
      productType: "card",
      set: "unknown",
      rarity: "common",
      type: "character",
      number: 0,
      lore: 1,
    }
  }

  return pool[Math.floor(Math.random() * pool.length)]
}

function loreFromCard(card: CardType): number {
  const lore = typeof card.lore === "number" && card.lore > 0 ? card.lore : 1
  return Math.max(1, Math.min(5, lore))
}

export default function PlayVsCpuPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading } = useUser()

  const [decks, setDecks] = useState<DeckForGame[]>([])
  const [allCards, setAllCards] = useState<CardType[]>([])
  const [selectedDeckId, setSelectedDeckId] = useState<string>("")
  const [loadingData, setLoadingData] = useState(false)

  const [playerLore, setPlayerLore] = useState(0)
  const [cpuLore, setCpuLore] = useState(0)
  const [turn, setTurn] = useState(0)
  const [battleLog, setBattleLog] = useState<BattleTurn[]>([])
  const [playing, setPlaying] = useState(false)
  const [winner, setWinner] = useState<"player" | "cpu" | null>(null)

  const selectedDeck = useMemo(
    () => decks.find((d) => d.id === selectedDeckId) || null,
    [decks, selectedDeckId]
  )

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

  const resetGame = () => {
    setPlayerLore(0)
    setCpuLore(0)
    setTurn(0)
    setBattleLog([])
    setPlaying(false)
    setWinner(null)
  }

  const playTurn = () => {
    if (!selectedDeck || winner) return

    setPlaying(true)

    const playerCard = drawCard(allCards, selectedDeck)
    const cpuCard = drawCard(allCards, selectedDeck)
    const playerGain = loreFromCard(playerCard)
    const cpuGain = loreFromCard(cpuCard)

    const nextTurn = turn + 1
    const nextPlayerLore = playerLore + playerGain
    const nextCpuLore = cpuLore + cpuGain

    setTurn(nextTurn)
    setPlayerLore(nextPlayerLore)
    setCpuLore(nextCpuLore)
    setBattleLog((prev) => [
      {
        turn: nextTurn,
        playerCardName: playerCard.name,
        playerLore: playerGain,
        cpuCardName: cpuCard.name,
        cpuLore: cpuGain,
      },
      ...prev,
    ])

    if (nextPlayerLore >= LORE_TARGET || nextCpuLore >= LORE_TARGET) {
      const finalWinner = nextPlayerLore >= nextCpuLore ? "player" : "cpu"
      setWinner(finalWinner)
      toast({
        title: finalWinner === "player" ? "Ganaste" : "Perdiste",
        description:
          finalWinner === "player"
            ? "Buen duelo. Puedes jugar otra para mejorar tu estrategia."
            : "La CPU ganó esta ronda. Prueba otro mazo o vuelve a intentarlo.",
      })
    }

    setPlaying(false)
  }

  if (loading || !user) return null

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-black">Jugar vs CPU</h1>
            <p className="text-muted-foreground mt-1">
              Modo practica inicial: carrera de lore usando tus mazos guardados.
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
                <Sword className="h-4 w-4" /> Configuracion
              </CardTitle>
              <CardDescription>Selecciona un mazo y empieza la partida.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Mazo</p>
                <Select value={selectedDeckId} onValueChange={setSelectedDeckId}>
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
                  <p>{selectedDeck.cards.length} cartas unicas</p>
                  <p>{selectedDeck.cards.reduce((acc, c) => acc + c.quantity, 0)} cartas totales</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={playTurn} disabled={!selectedDeck || loadingData || playing || !!winner} className="flex-1">
                  <Play className="h-4 w-4 mr-1" /> Jugar turno
                </Button>
                <Button variant="outline" onClick={resetGame}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              {decks.length === 0 && !loadingData && (
                <p className="text-xs text-muted-foreground">
                  No tienes mazos guardados todavia. Crea uno en Mis Mazos para jugar.
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
                    <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, (playerLore / LORE_TARGET) * 100)}%` }} />
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
                    <div className="h-full bg-accent transition-all" style={{ width: `${Math.min(100, (cpuLore / LORE_TARGET) * 100)}%` }} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Turno actual: {turn}</p>
                {winner && (
                  <Badge variant={winner === "player" ? "default" : "destructive"}>
                    {winner === "player" ? "Victoria" : "Derrota"}
                  </Badge>
                )}
              </div>

              <div className="rounded-lg border">
                <div className="p-3 border-b">
                  <p className="font-medium">Registro de turnos</p>
                </div>
                <div className="max-h-80 overflow-y-auto p-3 space-y-2">
                  {battleLog.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aun no hay turnos. Presiona "Jugar turno".</p>
                  )}
                  {battleLog.map((item) => (
                    <div key={item.turn} className="rounded border p-2 text-sm">
                      <p className="font-medium">Turno {item.turn}</p>
                      <p>Tu carta: {item.playerCardName} (+{item.playerLore} lore)</p>
                      <p>CPU: {item.cpuCardName} (+{item.cpuLore} lore)</p>
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

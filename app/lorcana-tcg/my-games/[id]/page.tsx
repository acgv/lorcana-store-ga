"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/hooks/use-user"
import { supabase } from "@/lib/db"
import { ArrowLeft, Sparkles, Shield, Swords } from "lucide-react"

type Turn = {
  turn_index: number
  action: string
  is_legal: boolean
  illegal_reason: string | null
  ink_before: number | null
  ink_cost: number | null
  ink_used: number | null
  player_card_id: string | null
  player_card_name: string | null
  player_lore_gain: number
  cpu_card_id: string | null
  cpu_card_name: string | null
  cpu_lore_gain: number
  engine_actor?: string | null
  engine_action?: any
  engine_events?: any
}

type Session = {
  id: string
  deck_id: string | null
  deck_name: string | null
  mode: "manual" | "auto"
  result: "player" | "cpu"
  created_at: string
}

type CatalogCard = {
  id: string | number
  name?: string | null
  image?: string | null
}

export default function VsCpuGameDetailsPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { user, loading: userLoading } = useUser()
  const { toast } = useToast()

  const [session, setSession] = useState<Session | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [allCards, setAllCards] = useState<CatalogCard[]>([])
  const [loading, setLoading] = useState(false)
  const [replayIndex, setReplayIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [replaySpeed, setReplaySpeed] = useState<0.5 | 1 | 2>(1)
  const [sharedUrl, setSharedUrl] = useState<string | null>(null)

  const canLoad = useMemo(() => Boolean(user && id), [user, id])
  const cardById = useMemo(() => {
    const m = new Map<string, CatalogCard>()
    for (const c of allCards) {
      m.set(String(c.id).toLowerCase().trim(), c)
    }
    return m
  }, [allCards])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!canLoad || !user?.id || !id) return
      setLoading(true)
      try {
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        if (!token) throw new Error("No hay sesión activa")

        const res = await fetch(`/api/games/vs-cpu/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error || "No se pudo cargar el replay")
        if (cancelled) return

        setSession(json.data.session)
        setTurns(json.data.turns || [])

        const cardsRes = await fetch(`/api/cards?t=${Date.now()}`, { cache: "no-store" })
        const cardsJson = await cardsRes.json()
        if (cardsJson?.success && !cancelled) {
          setAllCards(cardsJson.data || [])
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) {
          router.push("/lorcana-tcg/my-games")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [canLoad, id, router, user?.id])

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/lorcana-tcg/login")
    }
  }, [userLoading, user, router])

  useEffect(() => {
    // Por defecto mostramos todo el replay para mantener compatibilidad.
    setReplayIndex(turns.length)
    setIsPlaying(false)
  }, [turns.length])

  useEffect(() => {
    if (!isPlaying) return
    if (replayIndex >= turns.length) {
      setIsPlaying(false)
      return
    }
    const baseMs = 1200
    const tickMs = Math.max(300, Math.floor(baseMs / replaySpeed))
    const t = window.setTimeout(() => {
      setReplayIndex((prev) => Math.min(prev + 1, turns.length))
    }, tickMs)
    return () => window.clearTimeout(t)
  }, [isPlaying, replayIndex, replaySpeed, turns.length])

  if (userLoading || loading) return null
  if (!user) return null
  if (!session) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6 md:py-8">
          <p className="text-muted-foreground">No se pudo cargar el replay.</p>
        </main>
        <Footer />
      </div>
    )
  }

  const getPlayableFromTurn = (t: Turn) => {
    const actionDef = String((t.engine_action as any)?.definitionId || "").toLowerCase().trim()
    const fromEvents = Array.isArray(t.engine_events)
      ? t.engine_events.find((e: any) => typeof e?.definitionId === "string" && e.definitionId)
      : null
    const definitionId = actionDef || String(fromEvents?.definitionId || "").toLowerCase().trim()
    const fallbackName = (t.engine_action as any)?.definitionId || fromEvents?.definitionId || "Carta"
    const card = definitionId ? cardById.get(definitionId) : null
    return {
      id: definitionId || fallbackName,
      name: card?.name || fallbackName,
      image: card?.image || "/placeholder.svg",
    }
  }

  const getSpotlightCards = (t: Turn) => {
    const cards: Array<{ key: string; name: string; image: string; tag: string }> = []
    const seen = new Set<string>()
    if (!Array.isArray(t.engine_events)) return cards
    for (const e of t.engine_events as any[]) {
      const definitionId = typeof e?.definitionId === "string" ? e.definitionId.toLowerCase().trim() : ""
      if (!definitionId || seen.has(definitionId)) continue
      const c = cardById.get(definitionId)
      seen.add(definitionId)
      cards.push({
        key: definitionId,
        name: c?.name || definitionId,
        image: c?.image || "/placeholder.svg",
        tag: getEventLabel(e),
      })
    }
    return cards.slice(0, 4)
  }

  const actorTheme = (actor?: string | null) => {
    if (actor === "player") return "from-sky-500/15 to-cyan-500/5 border-sky-500/30"
    if (actor === "cpu") return "from-rose-500/15 to-orange-500/5 border-rose-500/30"
    return "from-violet-500/15 to-fuchsia-500/5 border-violet-500/30"
  }

  const getEventLabel = (e: any) => {
    const type = e?.type || "EVENT"
    if (type === "QUEST_LORE") return `Quest +${e?.loreGained ?? 0} lore`
    if (type === "CARD_BANISHED") return "Banish"
    if (type === "CHALLENGED") return `Challenge ${e?.attackerDamage ?? 0}/${e?.defenderDamage ?? 0}`
    if (type === "CARD_PLAYED") return "Carta jugada"
    if (type === "INKED") return "Entintó"
    if (type === "DRAW") return "Robo"
    if (type === "TURN_BEGIN") return "Inicio turno"
    if (type === "TURN_END") return "Fin turno"
    if (type === "GAME_OVER") return "Fin de partida"
    return type
  }

  const shareSummary = `Lorcana Replay: ${session.deck_name || "Mazo"} · ${
    session.result === "player" ? "Victoria" : "Derrota"
  } · ${turns.length} turnos · modo ${session.mode}`

  const shareUrl = sharedUrl || (typeof window !== "undefined"
    ? `${window.location.origin}/lorcana-tcg/my-games/${session.id}`
    : `/lorcana-tcg/my-games/${session.id}`)

  const ensureSharedUrl = async () => {
    if (sharedUrl) return sharedUrl
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error("No hay sesión activa")
    const res = await fetch(`/api/games/vs-cpu/${session.id}/share`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error || "No se pudo generar enlace público")
    const nextUrl = typeof window !== "undefined"
      ? `${window.location.origin}${json.data.url}`
      : json.data.url
    setSharedUrl(nextUrl)
    return nextUrl
  }

  const handleShare = async () => {
    try {
      const finalUrl = await ensureSharedUrl()
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: "Replay Lorcana",
          text: shareSummary,
          url: finalUrl,
        })
        return
      }
      await navigator.clipboard.writeText(`${shareSummary}\n${finalUrl}`)
      toast({
        title: "Replay copiado",
        description: "Se copió el texto para compartir.",
      })
    } catch (e) {
      console.error(e)
      toast({
        title: "No se pudo compartir",
        description: "Intenta copiar manualmente el enlace.",
        variant: "destructive",
      })
    }
  }

  const handleCopyLink = async () => {
    try {
      const finalUrl = await ensureSharedUrl()
      await navigator.clipboard.writeText(finalUrl)
      toast({ title: "Enlace copiado", description: "Listo para compartir." })
    } catch {
      toast({ title: "Error", description: "No se pudo copiar el enlace.", variant: "destructive" })
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Link href="/lorcana-tcg/my-games">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
            </Link>
          </div>
          <div className="flex gap-2 items-center">
            <Badge variant={session.result === "player" ? "default" : "destructive"}>
              {session.result === "player" ? "Victoria" : "Derrota"}
            </Badge>
            <Badge variant="secondary">{session.mode === "manual" ? "Manual" : "Auto"}</Badge>
            <Button size="sm" variant="outline" onClick={handleCopyLink}>
              Copiar link
            </Button>
            <Button size="sm" onClick={handleShare}>
              Compartir
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{session.deck_name || "Mazo"}</CardTitle>
            <CardDescription>{new Date(session.created_at).toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent>
            {turns.length > 0 && (
              <div className="mb-4 rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsPlaying(false)
                        setReplayIndex(0)
                      }}
                    >
                      Reiniciar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsPlaying(false)
                        setReplayIndex((prev) => Math.max(0, prev - 1))
                      }}
                      disabled={replayIndex <= 0}
                    >
                      Anterior
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (replayIndex >= turns.length) {
                          setReplayIndex(0)
                        }
                        setIsPlaying((prev) => !prev)
                      }}
                    >
                      {isPlaying ? "Pausar" : "Reproducir"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsPlaying(false)
                        setReplayIndex((prev) => Math.min(turns.length, prev + 1))
                      }}
                      disabled={replayIndex >= turns.length}
                    >
                      Siguiente
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      Turno visible: <span className="font-medium text-foreground">{Math.min(replayIndex, turns.length)}</span> /{" "}
                      {turns.length}
                    </span>
                    <Select
                      value={String(replaySpeed)}
                      onValueChange={(v) => setReplaySpeed(Number(v) as 0.5 | 1 | 2)}
                    >
                      <SelectTrigger className="h-8 w-[92px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5">x0.5</SelectItem>
                        <SelectItem value="1">x1</SelectItem>
                        <SelectItem value="2">x2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {turns.length === 0 ? (
                <p className="text-muted-foreground">No hay turnos guardados en este replay.</p>
              ) : (
                turns.slice(0, replayIndex).map((t, idx) => (
                  <div
                    key={`${t.turn_index}-${t.player_card_id || "p"}-${(t.engine_action as any)?.type || "legacy"}`}
                    className={[
                      "relative rounded-xl border p-3 overflow-hidden",
                      "bg-gradient-to-b",
                      actorTheme(t.engine_actor),
                    ].join(" ")}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/80 to-primary/20" />
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">Turno {t.turn_index}</p>
                        {idx === 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <Sparkles className="h-3 w-3" /> Inicio
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs">
                        {t.engine_action ? (
                          <span className="text-foreground font-medium">Motor</span>
                        ) : t.action === "illegal_attempt" ? (
                          <span className="text-destructive">Incorrecto</span>
                        ) : t.action === "pass" ? (
                          <span>Pasó</span>
                        ) : (
                          <span className="text-foreground">Correcto</span>
                        )}{" "}
                        {t.engine_action ? (
                          <span>
                            {" "}
                            · actor:{" "}
                            <span className="font-medium text-foreground">
                              {t.engine_actor === "player" ? "Jugador" : t.engine_actor === "cpu" ? "CPU" : (t.engine_actor || "?")}
                            </span>
                            {" "}· acción:{" "}
                            <span className="font-medium text-foreground">{(t.engine_action as any)?.type || "?"}</span>{" "}
                            {t.engine_actor === "player" ? (
                              <span className="inline-flex items-center gap-1 ml-1 text-sky-300">
                                <Shield className="h-3 w-3" /> P
                              </span>
                            ) : t.engine_actor === "cpu" ? (
                              <span className="inline-flex items-center gap-1 ml-1 text-rose-300">
                                <Swords className="h-3 w-3" /> CPU
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span>
                            · +{t.player_lore_gain} lore (jugador) · +{t.cpu_lore_gain} lore (CPU)
                          </span>
                        )}
                      </p>
                    </div>
                    {!t.engine_action && t.action === "illegal_attempt" && t.illegal_reason && (
                      <p className="text-xs text-destructive mb-2">{t.illegal_reason}</p>
                    )}
                    {t.engine_action ? (
                      <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                        {(t.engine_action as any)?.type === "PLAY_FROM_HAND" && (
                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Carta jugada</p>
                            <div className="flex items-center gap-3 rounded-md border bg-background/50 p-2">
                              <div className="relative w-14 h-20 rounded-md overflow-hidden border bg-muted shrink-0">
                                <Image
                                  src={getPlayableFromTurn(t).image}
                                  alt={getPlayableFromTurn(t).name}
                                  fill
                                  className="object-cover"
                                  sizes="56px"
                                  unoptimized={Boolean(getPlayableFromTurn(t).image?.startsWith("http"))}
                                />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{getPlayableFromTurn(t).name}</p>
                                <p className="text-xs text-muted-foreground">Acción: PLAY_FROM_HAND</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {getSpotlightCards(t).length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Cartas destacadas</p>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {getSpotlightCards(t).map((c) => (
                                <div key={c.key} className="w-[96px] shrink-0">
                                  <div className="relative w-[96px] h-[134px] rounded-md overflow-hidden border bg-muted shadow-sm">
                                    <Image
                                      src={c.image}
                                      alt={c.name}
                                      fill
                                      className="object-cover"
                                      sizes="96px"
                                      unoptimized={Boolean(c.image?.startsWith("http"))}
                                    />
                                  </div>
                                  <p className="text-[11px] mt-1 line-clamp-1">{c.name}</p>
                                  <p className="text-[10px] text-muted-foreground line-clamp-1">{c.tag}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <p className="text-sm font-medium">Eventos del turno</p>
                        {Array.isArray(t.engine_events) && t.engine_events.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {t.engine_events.slice(0, 10).map((e: any, idx: number) => (
                              <div key={idx} className="rounded-md border bg-background/50 p-2">
                                <p className="text-xs text-muted-foreground">
                                  {e?.player != null ? (Number(e.player) === 0 ? "Jugador" : "CPU") : "Sistema"}
                                </p>
                                <p className="text-sm font-medium">{getEventLabel(e)}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Sin eventos.</p>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-md border bg-muted/20 p-2">
                          <p className="text-sm font-medium">Tu carta</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{t.player_card_name || "—"}</p>
                          <p className="text-xs mt-1">Lore: +{t.player_lore_gain}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Ink: {t.ink_cost ?? 0} (tenías {t.ink_before ?? 0})
                          </p>
                        </div>
                        <div className="rounded-md border bg-muted/20 p-2">
                          <p className="text-sm font-medium">Carta CPU</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{t.cpu_card_name || "—"}</p>
                          <p className="text-xs mt-1">Lore: +{t.cpu_lore_gain}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}


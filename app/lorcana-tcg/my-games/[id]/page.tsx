"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/hooks/use-user"
import { supabase } from "@/lib/db"
import { ArrowLeft } from "lucide-react"

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
}

type Session = {
  id: string
  deck_id: string | null
  deck_name: string | null
  mode: "manual" | "auto"
  result: "player" | "cpu"
  created_at: string
}

export default function VsCpuGameDetailsPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { user, loading: userLoading } = useUser()

  const [session, setSession] = useState<Session | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [loading, setLoading] = useState(false)

  const canLoad = useMemo(() => Boolean(user && id), [user, id])

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
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{session.deck_name || "Mazo"}</CardTitle>
            <CardDescription>{new Date(session.created_at).toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {turns.length === 0 ? (
                <p className="text-muted-foreground">No hay turnos guardados en este replay.</p>
              ) : (
                turns.map((t) => (
                  <div key={`${t.turn_index}-${t.player_card_id || "p"}`} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <p className="font-medium">Turno {t.turn_index}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.action === "illegal_attempt" ? (
                          <span className="text-destructive">Incorrecto</span>
                        ) : t.action === "pass" ? (
                          <span>Pasó</span>
                        ) : (
                          <span className="text-foreground">Correcto</span>
                        )}{" "}
                        · +{t.player_lore_gain} lore (jugador) · +{t.cpu_lore_gain} lore (CPU)
                      </p>
                    </div>
                    {t.action === "illegal_attempt" && t.illegal_reason && (
                      <p className="text-xs text-destructive mb-2">{t.illegal_reason}</p>
                    )}
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


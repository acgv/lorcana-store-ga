"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type Session = {
  deck_name: string | null
  mode: "manual" | "auto"
  result: "player" | "cpu"
  created_at: string
}

type Turn = {
  turn_index: number
  engine_actor?: string | null
  engine_action?: any
}

export default function SharedReplayPage() {
  const { token } = useParams<{ token: string }>()
  const [session, setSession] = useState<Session | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!token) return
      setLoading(true)
      try {
        const res = await fetch(`/api/games/vs-cpu/share/${token}`)
        const json = await res.json()
        if (!json.success) throw new Error(json.error || "No se pudo cargar replay compartido")
        if (cancelled) return
        setSession(json.data.session)
        setTurns(json.data.turns || [])
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl md:text-4xl font-black">Replay Compartido</h1>
          <Link href="/lorcana-tcg/play">
            <Button variant="outline">Jugar ahora</Button>
          </Link>
        </div>
        {!session && !loading && <p className="text-muted-foreground">No se encontró este replay compartido.</p>}
        {session && (
          <Card>
            <CardHeader>
              <CardTitle>{session.deck_name || "Mazo"}</CardTitle>
              <CardDescription>{new Date(session.created_at).toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={session.result === "player" ? "default" : "destructive"}>
                  {session.result === "player" ? "Victoria Jugador" : "Victoria CPU"}
                </Badge>
                <Badge variant="secondary">{session.mode === "manual" ? "Manual" : "Auto"}</Badge>
              </div>
              <div className="space-y-2">
                {turns.map((t) => (
                  <div key={`${t.turn_index}-${t.engine_action?.type || "x"}`} className="rounded-md border p-2 text-sm">
                    <span className="font-medium">Turno {t.turn_index}</span>
                    <span className="text-muted-foreground"> · {t.engine_actor || "system"} · {t.engine_action?.type || "—"}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  )
}

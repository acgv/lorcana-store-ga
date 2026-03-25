"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/hooks/use-user"
import { supabase } from "@/lib/db"
import { Play } from "lucide-react"

type VsCpuSession = {
  id: string
  deck_id: string | null
  deck_name: string | null
  mode: "manual" | "auto"
  result: "player" | "cpu"
  created_at: string
}

export default function MyGamesPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [sessions, setSessions] = useState<VsCpuSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/lorcana-tcg/login")
    }
  }, [user, userLoading, router])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user?.id) return
      setLoadingSessions(true)
      try {
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        if (!token) throw new Error("No hay sesión activa")

        const res = await fetch("/api/games/vs-cpu", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error || "No se pudieron cargar las partidas")
        if (!cancelled) setSessions(json.data || [])
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoadingSessions(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  if (userLoading) return null
  if (!user) return null

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-black">Mis partidas</h1>
            <p className="text-muted-foreground mt-1">Replays de “Jugar vs CPU”.</p>
          </div>
          <Link href="/lorcana-tcg/play">
            <Button className="gap-2">
              <Play className="h-4 w-4" />
              Jugar
            </Button>
          </Link>
        </div>

        {loadingSessions ? (
          <Card>
            <CardContent className="py-8 text-muted-foreground text-sm text-center">
              Cargando partidas…
            </CardContent>
          </Card>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-muted-foreground text-sm text-center">
              Todavía no guardaste replays. Juega una partida y se guardará automáticamente al terminar.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sessions.map((s) => (
              <Card key={s.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3">
                    <span className="truncate">{s.deck_name || "Mazo"}</span>
                    <Badge variant={s.result === "player" ? "default" : "destructive"}>
                      {s.result === "player" ? "Victoria" : "Derrota"}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {s.mode === "manual" ? "Manual" : "Auto"} · {new Date(s.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={`/lorcana-tcg/my-games/${s.id}`}>
                    <Button className="w-full">Ver detalles</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}


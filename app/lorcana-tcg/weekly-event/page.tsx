"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/hooks/use-user"
import { supabase } from "@/lib/db"
import { Flame, CalendarDays } from "lucide-react"

type Stats = {
  totalGames: number
  wins: number
  bestWinStreak: number
  dailyCorrect: number
}

type WeeklyGoal = {
  id: string
  label: string
  current: number
  target: number
}

export default function WeeklyEventPage() {
  const { user, loading } = useUser()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loadingData, setLoadingData] = useState(false)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoadingData(true)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error("No hay sesión")
      const res = await fetch("/api/user/game-profile", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.success) {
        setStats(json.data.stats)
      }
    } finally {
      setLoadingData(false)
    }
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  const goals = useMemo<WeeklyGoal[]>(() => {
    if (!stats) return []
    return [
      { id: "g1", label: "Gana 5 partidas", current: stats.wins, target: 5 },
      { id: "g2", label: "Racha de 3 victorias", current: stats.bestWinStreak, target: 3 },
      { id: "g3", label: "Acierta 3 desafíos diarios", current: stats.dailyCorrect, target: 3 },
    ]
  }, [stats])

  const completed = goals.filter((g) => g.current >= g.target).length

  if (loading || !user) return null

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 space-y-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-black flex items-center gap-2">
              <Flame className="h-7 w-7 text-primary" /> Evento Semanal
            </h1>
            <p className="text-muted-foreground mt-1">Completa metas y demuestra constancia en Lorcana GA.</p>
          </div>
          <Link href="/lorcana-tcg/play">
            <Button variant="outline">Ir a jugar</Button>
          </Link>
        </div>

        <Card className="bg-gradient-to-b from-card to-muted/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Semana activa
            </CardTitle>
            <CardDescription>Progreso global del evento semanal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Metas completadas</p>
              <Badge variant="secondary">
                {completed}/{goals.length}
              </Badge>
            </div>
            <div className="h-2 rounded bg-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${Math.round((completed / Math.max(1, goals.length)) * 100)}%` }} />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(loadingData ? [] : goals).map((g) => {
            const pct = Math.min(100, Math.round((g.current / g.target) * 100))
            return (
              <Card key={g.id}>
                <CardHeader>
                  <CardTitle className="text-base">{g.label}</CardTitle>
                  <CardDescription>
                    {Math.min(g.current, g.target)}/{g.target}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="h-2 rounded bg-muted overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <Badge variant={g.current >= g.target ? "default" : "outline"}>
                    {g.current >= g.target ? "Completada" : `${pct}%`}
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
          {loadingData && <p className="text-sm text-muted-foreground">Cargando progreso semanal...</p>}
        </div>
      </main>
      <Footer />
    </div>
  )
}

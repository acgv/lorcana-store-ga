"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Trophy } from "lucide-react"

type Season = {
  id: string
  name: string
  description: string | null
  reward_xp: number
  is_active: boolean
  starts_at: string
  ends_at: string | null
}

type Goal = {
  id: string
  season_id: string
  code: string
  label: string
  target: number
  sort_order: number
}

export default function AdminWeeklyEventPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [goals, setGoals] = useState<Goal[]>([])

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [rewardXp, setRewardXp] = useState("120")

  const [g1, setG1] = useState("Gana 5 partidas")
  const [g1t, setG1t] = useState("5")
  const [g2, setG2] = useState("Racha de 3 victorias")
  const [g2t, setG2t] = useState("3")
  const [g3, setG3] = useState("Acierta 3 desafíos diarios")
  const [g3t, setG3t] = useState("3")

  const authHeaders = () => {
    const token = (typeof window !== "undefined" && localStorage.getItem("admin_token")) || null
    return token ? { Authorization: `Bearer ${token}` } : undefined
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/weekly-event", { headers: authHeaders(), credentials: "include" })
      const json = await res.json()
      if (json.success) {
        setSeasons(json.data.seasons || [])
        setGoals(json.data.goals || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const createSeason = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await fetch("/api/admin/weekly-event", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          rewardXp: Number(rewardXp || 120),
          activate: true,
          goals: [
            { code: "wins", label: g1.trim(), target: Number(g1t || 1), sortOrder: 0 },
            { code: "streak", label: g2.trim(), target: Number(g2t || 1), sortOrder: 1 },
            { code: "daily", label: g3.trim(), target: Number(g3t || 1), sortOrder: 2 },
          ],
        }),
      })
      await load()
      setName("")
      setDescription("")
    } finally {
      setSaving(false)
    }
  }

  const activate = async (seasonId: string) => {
    setSaving(true)
    try {
      await fetch("/api/admin/weekly-event", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        credentials: "include",
        body: JSON.stringify({ seasonId }),
      })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const goalsBySeason = useMemo(() => {
    const map: Record<string, Goal[]> = {}
    goals.forEach((g) => {
      if (!map[g.season_id]) map[g.season_id] = []
      map[g.season_id].push(g)
    })
    return map
  }, [goals])

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <AdminHeader title="Admin > Temporadas" />
        <main className="container mx-auto px-4 py-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Nueva temporada semanal</CardTitle>
              <CardDescription>Crea temporada y actívala en un clic.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Nombre temporada (ej: Season 1 - Abril)" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Descripción corta" value={description} onChange={(e) => setDescription(e.target.value)} />
              <Input placeholder="XP recompensa" value={rewardXp} onChange={(e) => setRewardXp(e.target.value)} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input placeholder="Meta 1" value={g1} onChange={(e) => setG1(e.target.value)} />
                <Input placeholder="Objetivo 1" value={g1t} onChange={(e) => setG1t(e.target.value)} />
                <div />
                <Input placeholder="Meta 2" value={g2} onChange={(e) => setG2(e.target.value)} />
                <Input placeholder="Objetivo 2" value={g2t} onChange={(e) => setG2t(e.target.value)} />
                <div />
                <Input placeholder="Meta 3" value={g3} onChange={(e) => setG3(e.target.value)} />
                <Input placeholder="Objetivo 3" value={g3t} onChange={(e) => setG3t(e.target.value)} />
              </div>
              <Button onClick={createSeason} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trophy className="h-4 w-4 mr-2" />}
                Guardar y activar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Temporadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                seasons.map((s) => (
                  <div key={s.id} className="rounded border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.description || "Sin descripción"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={s.is_active ? "default" : "outline"}>{s.is_active ? "Activa" : "Inactiva"}</Badge>
                        {!s.is_active && (
                          <Button size="sm" variant="outline" onClick={() => activate(s.id)} disabled={saving}>
                            Activar
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">Recompensa XP: {s.reward_xp}</div>
                    <ul className="text-sm list-disc ml-5">
                      {(goalsBySeason[s.id] || []).map((g) => (
                        <li key={g.id}>{g.label} ({g.target})</li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  )
}

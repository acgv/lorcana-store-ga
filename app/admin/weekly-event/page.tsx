"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Pencil, Trash2, Trophy } from "lucide-react"

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

type GoalDraft = {
  code: string
  label: string
  target: string
}

function toLocalDatetime(value: string | null | undefined) {
  if (!value) return ""
  const d = new Date(value)
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

export default function AdminWeeklyEventPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [rewardXp, setRewardXp] = useState("120")
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [isActive, setIsActive] = useState(true)

  const [goalDrafts, setGoalDrafts] = useState<GoalDraft[]>([
    { code: "wins", label: "Gana 5 partidas", target: "5" },
    { code: "streak", label: "Racha de 3 victorias", target: "3" },
    { code: "daily", label: "Acierta 3 desafíos diarios", target: "3" },
  ])

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
      const method = editingSeasonId ? "PUT" : "POST"
      await fetch("/api/admin/weekly-event", {
        method,
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        credentials: "include",
        body: JSON.stringify({
          seasonId: editingSeasonId,
          name: name.trim(),
          description: description.trim(),
          rewardXp: Number(rewardXp || 120),
          startsAt: startsAt || null,
          endsAt: endsAt || null,
          activate: isActive,
          isActive,
          goals: goalDrafts.map((g, idx) => ({
            code: g.code.trim() || `goal_${idx + 1}`,
            label: g.label.trim() || `Meta ${idx + 1}`,
            target: Number(g.target || 1),
            sortOrder: idx,
          })),
        }),
      })
      await load()
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setEditingSeasonId(null)
    setName("")
    setDescription("")
    setRewardXp("120")
    setStartsAt("")
    setEndsAt("")
    setIsActive(true)
    setGoalDrafts([
      { code: "wins", label: "Gana 5 partidas", target: "5" },
      { code: "streak", label: "Racha de 3 victorias", target: "3" },
      { code: "daily", label: "Acierta 3 desafíos diarios", target: "3" },
    ])
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

  const startEdit = (season: Season) => {
    setEditingSeasonId(season.id)
    setName(season.name)
    setDescription(season.description || "")
    setRewardXp(String(season.reward_xp || 120))
    setStartsAt(toLocalDatetime(season.starts_at))
    setEndsAt(toLocalDatetime(season.ends_at))
    setIsActive(Boolean(season.is_active))
    const sg = (goalsBySeason[season.id] || []).map((g) => ({
      code: g.code,
      label: g.label,
      target: String(g.target),
    }))
    setGoalDrafts(
      sg.length
        ? sg
        : [
            { code: "wins", label: "Gana 5 partidas", target: "5" },
            { code: "streak", label: "Racha de 3 victorias", target: "3" },
            { code: "daily", label: "Acierta 3 desafíos diarios", target: "3" },
          ]
    )
  }

  const removeSeason = async (seasonId: string) => {
    setSaving(true)
    try {
      await fetch(`/api/admin/weekly-event?seasonId=${encodeURIComponent(seasonId)}`, {
        method: "DELETE",
        headers: authHeaders(),
        credentials: "include",
      })
      await load()
      if (editingSeasonId === seasonId) resetForm()
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
              <CardTitle>{editingSeasonId ? "Editar temporada semanal" : "Nueva temporada semanal"}</CardTitle>
              <CardDescription>
                Configura metas, estado y fechas (inicio/fin) igual que una promoción programada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Nombre temporada (ej: Season 1 - Abril)" value={name} onChange={(e) => setName(e.target.value)} />
              <Textarea placeholder="Descripción corta" value={description} onChange={(e) => setDescription(e.target.value)} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input placeholder="XP recompensa" value={rewardXp} onChange={(e) => setRewardXp(e.target.value)} />
                <Input type="datetime-local" placeholder="Inicio" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                <Input type="datetime-local" placeholder="Fin" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  onClick={() => setIsActive((v) => !v)}
                >
                  {isActive ? "Activa" : "Inactiva"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  Solo una temporada puede quedar activa al mismo tiempo.
                </span>
              </div>

              <div className="space-y-2">
                {goalDrafts.map((goal, idx) => (
                  <div key={`${goal.code}-${idx}`} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input
                      placeholder="Código (wins/streak/daily)"
                      value={goal.code}
                      onChange={(e) =>
                        setGoalDrafts((prev) =>
                          prev.map((g, i) => (i === idx ? { ...g, code: e.target.value } : g))
                        )
                      }
                    />
                    <Input
                      placeholder={`Meta ${idx + 1}`}
                      value={goal.label}
                      onChange={(e) =>
                        setGoalDrafts((prev) =>
                          prev.map((g, i) => (i === idx ? { ...g, label: e.target.value } : g))
                        )
                      }
                    />
                    <Input
                      placeholder={`Objetivo ${idx + 1}`}
                      value={goal.target}
                      onChange={(e) =>
                        setGoalDrafts((prev) =>
                          prev.map((g, i) => (i === idx ? { ...g, target: e.target.value } : g))
                        )
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={createSeason} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trophy className="h-4 w-4 mr-2" />}
                  {editingSeasonId ? "Guardar cambios" : "Guardar y activar"}
                </Button>
                {editingSeasonId && (
                  <Button variant="outline" onClick={resetForm} disabled={saving}>
                    Cancelar edición
                  </Button>
                )}
              </div>
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
                        <Button size="sm" variant="outline" onClick={() => startEdit(s)} disabled={saving}>
                          <Pencil className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        {!s.is_active && (
                          <Button size="sm" variant="outline" onClick={() => activate(s.id)} disabled={saving}>
                            Activar
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => removeSeason(s.id)} disabled={saving}>
                          <Trash2 className="h-3 w-3 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Recompensa XP: {s.reward_xp} | Inicio: {new Date(s.starts_at).toLocaleString()} | Fin:{" "}
                      {s.ends_at ? new Date(s.ends_at).toLocaleString() : "Sin fin"}
                    </div>
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

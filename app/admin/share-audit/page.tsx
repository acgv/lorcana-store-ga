"use client"

import { useEffect, useMemo, useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, ShieldAlert } from "lucide-react"

type AuditRow = {
  id: string
  session_id: string | null
  user_id: string | null
  event_type: string
  token: string | null
  ip: string | null
  user_agent: string | null
  meta: any
  created_at: string
}

export default function ShareAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [eventFilter, setEventFilter] = useState("")

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const token = (typeof window !== "undefined" && localStorage.getItem("admin_token")) || null
        const q = new URLSearchParams()
        if (eventFilter.trim()) q.set("eventType", eventFilter.trim())
        q.set("limit", "200")
        const res = await fetch(`/api/admin/share-audit?${q.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: "include",
        })
        const json = await res.json()
        if (json.success) setRows(json.data || [])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [eventFilter])

  const counts = useMemo(() => {
    return rows.reduce((acc, r) => {
      acc[r.event_type] = (acc[r.event_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [rows])

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <AdminHeader title="Share Security Audit" />
        <main className="container mx-auto px-4 py-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" /> Auditoria de Enlaces Compartidos
              </CardTitle>
              <CardDescription>Eventos de seguridad: crear, abrir, expirado, rate limit, revocar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Filtrar por event_type"
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {Object.entries(counts).map(([k, v]) => (
                  <Badge key={k} variant="secondary">
                    {k}: {v}
                  </Badge>
                ))}
              </div>

              {loading ? (
                <div className="py-8 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin eventos para mostrar.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2">Fecha</th>
                        <th className="text-left p-2">Evento</th>
                        <th className="text-left p-2">IP</th>
                        <th className="text-left p-2">Session</th>
                        <th className="text-left p-2">Token</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-t">
                          <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                          <td className="p-2">
                            <Badge variant="outline">{r.event_type}</Badge>
                          </td>
                          <td className="p-2 text-muted-foreground">{r.ip || "—"}</td>
                          <td className="p-2 text-muted-foreground">{r.session_id?.slice(0, 8) || "—"}</td>
                          <td className="p-2 text-muted-foreground">{r.token?.slice(0, 10) || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  )
}

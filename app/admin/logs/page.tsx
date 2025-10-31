"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Activity, CheckCircle, XCircle, Edit, Plus } from "lucide-react"
import type { ActivityLog } from "@/lib/types"

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs?limit=100")
      const data = await res.json()
      if (data.success) {
        setLogs(data.data)
      }
    } catch (error) {
      console.error("Error fetching logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    if (action.includes("approved")) return <CheckCircle className="h-4 w-4 text-primary" />
    if (action.includes("rejected")) return <XCircle className="h-4 w-4 text-destructive" />
    if (action.includes("updated") || action.includes("edited")) return <Edit className="h-4 w-4 text-accent" />
    if (action.includes("created")) return <Plus className="h-4 w-4 text-secondary" />
    return <Activity className="h-4 w-4 text-muted-foreground" />
  }

  const getActionColor = (action: string) => {
    if (action.includes("approved")) return "default"
    if (action.includes("rejected")) return "destructive"
    if (action.includes("updated") || action.includes("edited")) return "secondary"
    if (action.includes("created")) return "outline"
    return "outline"
  }

  const formatAction = (action: string) => {
    return action
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="font-display text-3xl font-black tracking-wide">Activity Log</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground font-serif">Loading activity logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold mb-2">No Activity Yet</h2>
            <p className="text-muted-foreground font-serif">Activity logs will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <Card key={log.id} className="p-4 border-border hover:border-primary/30 transition-all">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getActionColor(log.action) as any} className="font-serif">
                            {formatAction(log.action)}
                          </Badge>
                          <Badge variant="outline" className="font-serif text-xs">
                            {log.entityType}
                          </Badge>
                        </div>
                        <p className="text-sm font-serif">
                          <span className="font-semibold">{log.userId}</span> performed this action
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground font-serif whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="text-xs text-muted-foreground font-serif mt-2 p-2 rounded bg-muted/50">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      Entity ID: {log.entityId}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}


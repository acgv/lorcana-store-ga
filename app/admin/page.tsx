"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AuthGuard } from "@/components/auth-guard"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, CheckCircle, XCircle, Clock, Activity, Package } from "lucide-react"

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  })

  useEffect(() => {
    // Fetch stats from API
    fetch("/api/submissions")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const submissions = data.data
          setStats({
            pending: submissions.filter((s: any) => s.status === "pending").length,
            approved: submissions.filter((s: any) => s.status === "approved").length,
            rejected: submissions.filter((s: any) => s.status === "rejected").length,
            total: submissions.length,
          })
        }
      })
      .catch(console.error)
  }, [])

  return (
    <AuthGuard>
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-3xl font-black tracking-wide">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Lorcana Admin
              </span>
            </h1>
            <nav className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" className="font-sans">
                  View Store
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="font-sans text-4xl font-bold mb-2 tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground font-sans">
            Manage card submissions and review pending data
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 border-border hover:border-primary/50 transition-all">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-sans">Pending Review</p>
                <p className="text-3xl font-sans font-bold">{stats.pending}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border hover:border-primary/50 transition-all">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-sans">Approved</p>
                <p className="text-3xl font-sans font-bold">{stats.approved}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border hover:border-primary/50 transition-all">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-sans">Rejected</p>
                <p className="text-3xl font-sans font-bold">{stats.rejected}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border hover:border-primary/50 transition-all">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-sans">Total Submissions</p>
                <p className="text-3xl font-sans font-bold">{stats.total}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/admin/submissions">
            <Card className="p-6 border-border hover:border-primary/50 transition-all cursor-pointer group">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <Clock className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-sans text-xl font-bold mb-2 tracking-tight">
                    Pending Submissions
                  </h3>
                  <p className="text-sm text-muted-foreground font-sans">
                    Review and approve new card data from mobile app
                  </p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/inventory">
            <Card className="p-6 border-border hover:border-primary/50 transition-all cursor-pointer group">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-sans text-xl font-bold mb-2 tracking-tight">Inventory Management</h3>
                  <p className="text-sm text-muted-foreground font-sans">
                    Manage stock levels for all card versions
                  </p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/logs">
            <Card className="p-6 border-border hover:border-primary/50 transition-all cursor-pointer group">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                  <Activity className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-sans text-xl font-bold mb-2 tracking-tight">Activity Log</h3>
                  <p className="text-sm text-muted-foreground font-sans">
                    View system activity and changes history
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </main>
    </div>
    </AuthGuard>
  )
}


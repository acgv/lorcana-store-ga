"use client"

import { useEffect, useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  Package, 
  Activity,
  RefreshCw,
  ExternalLink,
  LogIn,
  Search,
  Filter,
  Heart,
  ShoppingBag
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"

interface AnalyticsData {
  conversion: {
    totalOrders: number
    totalRevenue: number
    averageOrderValue: number
    ordersByDay: Array<{ date: string; count: number; revenue: number }>
  }
  users: {
    total: number
    authenticated: number
    conversionRate: number
  }
  collection: {
    totalItems: number
    uniqueUsers: number
    ownedItems: number
    wantedItems: number
    averageItemsPerUser: number
  }
  inventory: {
    cardsWithStock: number
    totalCards: number
  }
  activity: {
    last24Hours: number
    byAction: Record<string, number>
    recentLogs: Array<any>
  }
}

export default function AnalyticsPage() {
  const { t } = useLanguage()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const { supabase } = await import("@/lib/db")
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }

      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const response = await fetch("/api/admin/analytics", {
        headers,
      })

      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || "Failed to load analytics")
      }
    } catch (err) {
      console.error("Error fetching analytics:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("es-CL").format(num)
  }

  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-screen bg-background">
        <AdminHeader />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-4xl font-bold mb-2">Analytics Dashboard</h1>
              <p className="text-muted-foreground">
                Métricas de uso, conversión y actividad de la aplicación
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={fetchAnalytics}
                disabled={loading}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open("https://vercel.com/analytics", "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Vercel Analytics
              </Button>
            </div>
          </div>

          {loading && (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Cargando métricas...</p>
            </div>
          )}

          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">{error}</p>
                <Button onClick={fetchAnalytics} variant="outline" className="mt-4">
                  Reintentar
                </Button>
              </CardContent>
            </Card>
          )}

          {data && !loading && (
            <div className="space-y-6">
              {/* Métricas principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Órdenes</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(data.conversion.totalOrders)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Órdenes aprobadas
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(data.conversion.totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ingresos brutos
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(data.conversion.averageOrderValue)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Por orden
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Usuarios Autenticados</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(data.users.authenticated)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.users.conversionRate.toFixed(1)}% del total
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Métricas de colección */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Items en Colección</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(data.collection.totalItems)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.collection.uniqueUsers} usuarios
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cartas que Tienen</CardTitle>
                    <Heart className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatNumber(data.collection.ownedItems)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Estado: "Tengo"
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Promedio por Usuario</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {data.collection.averageItemsPerUser.toFixed(1)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Items por usuario
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cartas con Stock</CardTitle>
                    <Package className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatNumber(data.inventory?.cardsWithStock || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.inventory?.totalCards ? `de ${formatNumber(data.inventory.totalCards)} total` : "Disponibles para venta"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Órdenes por día */}
              <Card>
                <CardHeader>
                  <CardTitle>Órdenes por Día (Últimos 7 días)</CardTitle>
                  <CardDescription>
                    Tendencias de ventas diarias
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.conversion.ordersByDay.map((day) => (
                      <div key={day.date} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium">
                            {new Date(day.date).toLocaleDateString("es-CL", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-semibold">{day.count} órdenes</div>
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(day.revenue)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Actividad reciente */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Actividad (Últimas 24h)
                    </CardTitle>
                    <CardDescription>
                      Eventos registrados en el sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total de eventos</span>
                        <Badge variant="outline" className="text-lg">
                          {data.activity.last24Hours}
                        </Badge>
                      </div>
                      <div className="space-y-2 pt-2 border-t">
                        {Object.entries(data.activity.byAction).map(([action, count]) => (
                          <div key={action} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground capitalize">
                              {action.replace(/_/g, " ")}
                            </span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LogIn className="h-5 w-5" />
                      Métricas de Conversión
                    </CardTitle>
                    <CardDescription>
                      Tasa de conversión de usuarios
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Usuarios Totales</span>
                          <span className="text-sm font-bold">{formatNumber(data.users.total)}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{
                              width: `${data.users.conversionRate}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Usuarios Autenticados</span>
                          <span className="text-sm font-bold text-primary">
                            {formatNumber(data.users.authenticated)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {data.users.conversionRate.toFixed(1)}% de conversión
                        </div>
                      </div>
                      <div className="pt-4 border-t">
                        <div className="text-xs text-muted-foreground">
                          💡 Tip: Los eventos detallados (login, búsquedas, filtros, etc.) están disponibles en{" "}
                          <a
                            href="https://vercel.com/analytics"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Vercel Analytics
                          </a>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Información sobre eventos trackeados */}
              <Card>
                <CardHeader>
                  <CardTitle>Eventos Trackeados</CardTitle>
                  <CardDescription>
                    Eventos que se están monitoreando en la aplicación
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <LogIn className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">Autenticación</span>
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                        <li>• login_attempt</li>
                        <li>• login_success</li>
                        <li>• login_failed</li>
                        <li>• feature_blocked_no_auth</li>
                      </ul>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">Colección</span>
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                        <li>• collection_view</li>
                        <li>• collection_card_add</li>
                        <li>• collection_card_remove</li>
                      </ul>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <ShoppingCart className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">Compras</span>
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                        <li>• cart_add</li>
                        <li>• checkout_start</li>
                        <li>• checkout_complete</li>
                      </ul>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Search className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">Navegación</span>
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                        <li>• page_view</li>
                        <li>• section_view</li>
                        <li>• card_search</li>
                        <li>• filter_applied</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}


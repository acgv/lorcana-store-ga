"use client"

import { useEffect, useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Package, DollarSign, ShoppingBag, Eye } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface OrderItem {
  id: string
  title: string
  quantity: number
  unit_price: number
}

interface Order {
  id: string
  payment_id: string
  external_reference: string
  status: string
  customer_email: string
  customer_name?: string
  items: OrderItem[]
  total_amount: number
  currency: string
  payment_method?: string
  payment_type?: string
  created_at: string
  updated_at: string
  paid_at?: string
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    if (searchTerm === "") {
      setFilteredOrders(orders)
    } else {
      const filtered = orders.filter(
        (order) =>
          order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.payment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.external_reference?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredOrders(filtered)
    }
  }, [searchTerm, orders])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/orders")
      const data = await response.json()

      if (data.success) {
        setOrders(data.orders)
        setFilteredOrders(data.orders)
      } else {
        console.error("Error fetching orders:", data.error)
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      approved: { variant: "default", label: "Aprobado" },
      pending: { variant: "secondary", label: "Pendiente" },
      rejected: { variant: "destructive", label: "Rechazado" },
      cancelled: { variant: "outline", label: "Cancelado" },
      refunded: { variant: "outline", label: "Reembolsado" },
    }

    const config = variants[status] || { variant: "outline", label: status }
    return (
      <Badge variant={config.variant as any} className="capitalize">
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-CL", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getTotalRevenue = () => {
    return orders
      .filter((order) => order.status === "approved")
      .reduce((sum, order) => sum + Number(order.total_amount), 0)
  }

  const getTotalOrders = () => {
    return orders.filter((order) => order.status === "approved").length
  }

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order)
    setDetailsOpen(true)
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <AdminHeader />

        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Órdenes de Compra</h1>
            <p className="text-muted-foreground">
              Gestiona y revisa todas las órdenes realizadas en la tienda
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Órdenes</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getTotalOrders()}</div>
                <p className="text-xs text-muted-foreground">Órdenes aprobadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${Math.floor(getTotalRevenue()).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Ventas aprobadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Productos Vendidos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {orders
                    .filter((order) => order.status === "approved")
                    .reduce((sum, order) => {
                      return (
                        sum +
                        order.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0)
                      )
                    }, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Cartas vendidas</p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por email, payment ID o referencia..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>Todas las Órdenes ({filteredOrders.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando órdenes...</div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No se encontraron órdenes" : "No hay órdenes aún"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium">Fecha</th>
                        <th className="text-left p-4 font-medium">Cliente</th>
                        <th className="text-left p-4 font-medium">Items</th>
                        <th className="text-left p-4 font-medium">Total</th>
                        <th className="text-left p-4 font-medium">Estado</th>
                        <th className="text-left p-4 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="p-4 text-sm">{formatDate(order.created_at)}</td>
                          <td className="p-4">
                            <div className="text-sm">
                              <div className="font-medium">{order.customer_email}</div>
                              <div className="text-xs text-muted-foreground">
                                {order.payment_id.substring(0, 20)}...
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm">{order.items.length} item(s)</td>
                          <td className="p-4 text-sm font-medium">
                            ${Math.floor(Number(order.total_amount)).toLocaleString()} {order.currency}
                          </td>
                          <td className="p-4">{getStatusBadge(order.status)}</td>
                          <td className="p-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openOrderDetails(order)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        {/* Order Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalles de la Orden</DialogTitle>
              <DialogDescription>
                Información completa de la orden #{selectedOrder?.external_reference}
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-6">
                {/* Customer Info */}
                <div>
                  <h3 className="font-semibold mb-2">Cliente</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Email:</span> {selectedOrder.customer_email}
                    </p>
                    {selectedOrder.customer_name && (
                      <p>
                        <span className="text-muted-foreground">Nombre:</span> {selectedOrder.customer_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Payment Info */}
                <div>
                  <h3 className="font-semibold mb-2">Información de Pago</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Payment ID:</span> {selectedOrder.payment_id}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Referencia:</span>{" "}
                      {selectedOrder.external_reference}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Estado:</span> {getStatusBadge(selectedOrder.status)}
                    </p>
                    {selectedOrder.payment_method && (
                      <p>
                        <span className="text-muted-foreground">Método:</span> {selectedOrder.payment_method}
                      </p>
                    )}
                    {selectedOrder.paid_at && (
                      <p>
                        <span className="text-muted-foreground">Pagado:</span>{" "}
                        {formatDate(selectedOrder.paid_at)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="font-semibold mb-2">Productos</h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-muted rounded-md"
                      >
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Cantidad: {item.quantity} × ${Math.floor(item.unit_price).toLocaleString()}
                          </p>
                        </div>
                        <p className="font-semibold">
                          ${Math.floor(item.quantity * item.unit_price).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span className="text-green-600">
                      ${Math.floor(Number(selectedOrder.total_amount)).toLocaleString()}{" "}
                      {selectedOrder.currency}
                    </span>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
                  <p>Creado: {formatDate(selectedOrder.created_at)}</p>
                  <p>Actualizado: {formatDate(selectedOrder.updated_at)}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  )
}


"use client"

import { useState, useEffect } from "react"
import { AdminHeader } from "@/components/admin-header"
import { Footer } from "@/components/footer"
import { AuthGuard } from "@/components/auth-guard"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Save, Loader2, Truck } from "lucide-react"

export default function ShippingSettingsPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [thresholds, setThresholds] = useState({
    free_shipping_threshold: 50000,
    zone_rm_cost: 5000,
    zone_other_cost: 8000,
    zone_extreme_cost: 12000,
  })

  useEffect(() => {
    fetchThresholds()
  }, [])

  const fetchThresholds = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/shipping-thresholds")
      const data = await response.json()

      if (data.success && data.data) {
        setThresholds({
          free_shipping_threshold: data.data.free_shipping_threshold || 50000,
          zone_rm_cost: data.data.zone_rm_cost || 5000,
          zone_other_cost: data.data.zone_other_cost || 8000,
          zone_extreme_cost: data.data.zone_extreme_cost || 12000,
        })
      }
    } catch (error) {
      console.error("Error fetching shipping thresholds:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load shipping thresholds",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch("/api/shipping-thresholds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(thresholds),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Shipping thresholds updated successfully",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Failed to update shipping thresholds",
        })
      }
    } catch (error) {
      console.error("Error saving shipping thresholds:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save shipping thresholds",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex flex-col">
          <AdminHeader title="Configuración de Envíos" />
          <main className="flex-1 container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Cargando...</p>
            </div>
          </main>
          <Footer />
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <AdminHeader title="Configuración de Envíos" />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Umbrales de Envío
              </CardTitle>
              <CardDescription>
                Configura los umbrales y costos de envío para tu tienda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Umbral de Envío Gratis */}
              <div className="space-y-2">
                <Label htmlFor="free_shipping_threshold">
                  Monto Mínimo para Envío Gratis (CLP)
                </Label>
                <Input
                  id="free_shipping_threshold"
                  type="number"
                  min="0"
                  step="1000"
                  value={thresholds.free_shipping_threshold}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      free_shipping_threshold: Number(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Si el carrito supera este monto, el envío será gratis
                </p>
              </div>

              {/* Costos por Zona */}
              <div className="space-y-4">
                <h3 className="font-semibold">Costos de Envío por Zona</h3>

                <div className="space-y-2">
                  <Label htmlFor="zone_rm_cost">
                    Región Metropolitana (CLP)
                  </Label>
                  <Input
                    id="zone_rm_cost"
                    type="number"
                    min="0"
                    step="1000"
                    value={thresholds.zone_rm_cost}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        zone_rm_cost: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zone_other_cost">
                    Otras Regiones (CLP)
                  </Label>
                  <Input
                    id="zone_other_cost"
                    type="number"
                    min="0"
                    step="1000"
                    value={thresholds.zone_other_cost}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        zone_other_cost: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zone_extreme_cost">
                    Zonas Extremas (CLP)
                  </Label>
                  <Input
                    id="zone_extreme_cost"
                    type="number"
                    min="0"
                    step="1000"
                    value={thresholds.zone_extreme_cost}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        zone_extreme_cost: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    </AuthGuard>
  )
}


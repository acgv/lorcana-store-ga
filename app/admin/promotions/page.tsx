"use client"

import { useState, useEffect } from "react"
import { AdminHeader } from "@/components/admin-header"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/components/language-provider"
import { ArrowLeft, Save, Loader2, Tag } from "lucide-react"
import Link from "next/link"

interface Promotion {
  id: string
  name: string
  is_active: boolean
  title: string | null
  description: string | null
  discount_percentage: number
  start_date: string | null
  end_date: string | null
  banner_text: string | null
  banner_color: string
}

export default function PromotionsPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [promotion, setPromotion] = useState<Promotion>({
    id: "black-friday-2025",
    name: "Black Friday 2025",
    is_active: false,
    title: "¡Viernes Negro!",
    description: "Descuentos especiales en toda la tienda",
    discount_percentage: 0,
    start_date: null,
    end_date: null,
    banner_text: "🎉 ¡Viernes Negro! Descuentos especiales",
    banner_color: "#000000",
  })

  useEffect(() => {
    fetchPromotion()
  }, [])

  const fetchPromotion = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/promotions?includeInactive=true")
      const result = await response.json()

      if (result.success && result.data && result.data.length > 0) {
        // Buscar la promoción de Black Friday o usar la primera
        const blackFriday = result.data.find((p: Promotion) => p.id === "black-friday-2025")
        if (blackFriday) {
          setPromotion(blackFriday)
        } else if (result.data[0]) {
          setPromotion(result.data[0])
        }
      }
    } catch (error) {
      console.error("Error fetching promotion:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar la promoción",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch("/api/promotions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(promotion),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "✅ Éxito",
          description: `Promoción ${promotion.is_active ? "activada" : "desactivada"} correctamente`,
        })
      } else {
        throw new Error(result.error || "Error al guardar")
      }
    } catch (error) {
      console.error("Error saving promotion:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo guardar la promoción",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background">
          <AdminHeader title="Promociones" />
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Cargando promoción...</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <AdminHeader title="Promociones" />
        
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 py-4">
          <Link href="/admin/inventory">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver al Inventario
            </Button>
          </Link>
        </div>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                <CardTitle className="text-2xl">Viernes Negro 2025</CardTitle>
              </div>
              <CardDescription>
                Activa o desactiva la promoción de Viernes Negro. Cuando esté activa, se mostrará un banner en todas las páginas del sitio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Toggle Activo/Inactivo */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                <div className="space-y-0.5">
                  <Label htmlFor="is-active" className="text-base font-semibold">
                    Estado de la Promoción
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {promotion.is_active 
                      ? "✅ La promoción está activa y visible en el sitio"
                      : "❌ La promoción está oculta"}
                  </p>
                </div>
                <Switch
                  id="is-active"
                  checked={promotion.is_active}
                  onCheckedChange={(checked) =>
                    setPromotion({ ...promotion, is_active: checked })
                  }
                />
              </div>

              {/* Configuración del Banner */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Configuración del Banner</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="banner-text">Texto del Banner</Label>
                  <Input
                    id="banner-text"
                    value={promotion.banner_text || ""}
                    onChange={(e) =>
                      setPromotion({ ...promotion, banner_text: e.target.value })
                    }
                    placeholder="🎉 ¡Viernes Negro! Descuentos especiales"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="banner-color">Color del Banner (Hex)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="banner-color"
                      value={promotion.banner_color}
                      onChange={(e) =>
                        setPromotion({ ...promotion, banner_color: e.target.value })
                      }
                      placeholder="#000000"
                      className="flex-1"
                    />
                    <div
                      className="w-12 h-10 rounded border border-border"
                      style={{ backgroundColor: promotion.banner_color }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Título de la Promoción</Label>
                  <Input
                    id="title"
                    value={promotion.title || ""}
                    onChange={(e) =>
                      setPromotion({ ...promotion, title: e.target.value })
                    }
                    placeholder="¡Viernes Negro!"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={promotion.description || ""}
                    onChange={(e) =>
                      setPromotion({ ...promotion, description: e.target.value })
                    }
                    placeholder="Descuentos especiales en toda la tienda"
                    rows={3}
                  />
                </div>
              </div>

              {/* Preview del Banner */}
              {promotion.is_active && promotion.banner_text && (
                <div className="p-4 rounded-lg border border-border bg-muted/30">
                  <Label className="text-sm font-semibold mb-2 block">Vista Previa del Banner</Label>
                  <div
                    className="p-4 rounded-lg text-white text-center font-semibold"
                    style={{ backgroundColor: promotion.banner_color }}
                  >
                    {promotion.banner_text}
                  </div>
                </div>
              )}

              {/* Botón Guardar */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  size="lg"
                  className="gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  )
}


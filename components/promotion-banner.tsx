"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface Promotion {
  id: string
  is_active: boolean
  banner_text: string | null
  banner_color: string
  title: string | null
  description: string | null
}

export function PromotionBanner() {
  const [promotion, setPromotion] = useState<Promotion | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Verificar si el banner fue descartado en esta sesión
    const dismissedKey = `promotion-dismissed-${new Date().toDateString()}`
    const wasDismissed = sessionStorage.getItem(dismissedKey)
    if (wasDismissed) {
      setDismissed(true)
      return
    }

    // Cargar promoción activa
    const fetchPromotion = async () => {
      try {
        const response = await fetch("/api/promotions")
        const result = await response.json()

        if (result.success && result.data && result.data.length > 0) {
          const activePromotion = result.data.find((p: Promotion) => p.is_active)
          if (activePromotion && activePromotion.banner_text) {
            setPromotion(activePromotion)
          }
        }
      } catch (error) {
        console.error("Error fetching promotion:", error)
      }
    }

    fetchPromotion()
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    // Guardar en sessionStorage para esta sesión
    const dismissedKey = `promotion-dismissed-${new Date().toDateString()}`
    sessionStorage.setItem(dismissedKey, "true")
  }

  if (dismissed || !promotion || !promotion.banner_text) {
    return null
  }

  return (
    <div
      className="relative w-full py-3 px-4 text-center text-white font-semibold text-sm md:text-base"
      style={{ backgroundColor: promotion.banner_color }}
    >
      <div className="container mx-auto flex items-center justify-center gap-4">
        <Link href="/lorcana-tcg/catalog" className="flex-1 hover:underline">
          {promotion.banner_text}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-white hover:bg-white/20 flex-shrink-0"
          onClick={handleDismiss}
          aria-label="Cerrar banner"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}


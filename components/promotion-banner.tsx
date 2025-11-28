"use client"

import { useState, useEffect } from "react"
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

  useEffect(() => {
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

  if (!promotion || !promotion.banner_text) {
    return null
  }

  return (
    <div
      className="relative w-full py-3 px-4 text-center text-white font-semibold text-sm md:text-base"
      style={{ backgroundColor: promotion.banner_color }}
    >
      <div className="container mx-auto flex items-center justify-center">
        <Link href="/lorcana-tcg/catalog" className="hover:underline">
          {promotion.banner_text}
        </Link>
      </div>
    </div>
  )
}


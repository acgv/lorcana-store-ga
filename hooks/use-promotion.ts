"use client"

import { useState, useEffect } from "react"

export interface Promotion {
  id: string
  is_active: boolean
  discount_percentage: number
  discount_minimum_amount: number
  shipping_discount_percentage: number
  free_shipping: boolean
  free_shipping_minimum_amount: number
  banner_text: string | null
  banner_color: string
}

export function usePromotion() {
  const [promotion, setPromotion] = useState<Promotion | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPromotion = async () => {
      try {
        const response = await fetch("/api/promotions")
        const result = await response.json()

        if (result.success && result.data && result.data.length > 0) {
          const activePromotion = result.data.find((p: Promotion) => p.is_active)
          if (activePromotion) {
            setPromotion(activePromotion)
          }
        }
      } catch (error) {
        console.error("Error fetching promotion:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPromotion()
  }, [])

  // Calcular descuento en productos
  const calculateProductDiscount = (subtotal: number): number => {
    if (!promotion || !promotion.is_active) return 0
    
    if (promotion.discount_percentage > 0 && subtotal >= promotion.discount_minimum_amount) {
      return (subtotal * promotion.discount_percentage) / 100
    }
    
    return 0
  }

  // Calcular descuento en envío
  const calculateShippingDiscount = (shippingCost: number, subtotal: number): number => {
    if (!promotion || !promotion.is_active) return 0
    
    // Envío gratis
    if (promotion.free_shipping && subtotal >= promotion.free_shipping_minimum_amount) {
      return shippingCost
    }
    
    // Descuento porcentual en envío
    if (promotion.shipping_discount_percentage > 0) {
      return (shippingCost * promotion.shipping_discount_percentage) / 100
    }
    
    return 0
  }

  // Obtener costo final de envío después de descuentos
  const getFinalShippingCost = (shippingCost: number, subtotal: number): number => {
    const discount = calculateShippingDiscount(shippingCost, subtotal)
    return Math.max(0, shippingCost - discount)
  }

  return {
    promotion,
    loading,
    calculateProductDiscount,
    calculateShippingDiscount,
    getFinalShippingCost,
  }
}


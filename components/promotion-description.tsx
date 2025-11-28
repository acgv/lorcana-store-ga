"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Lock, Truck, Sparkles, Calendar } from "lucide-react"

interface Promotion {
  id: string
  is_active: boolean
  title: string | null
  description: string | null
  banner_text: string | null
  banner_color: string
}

export function PromotionDescription() {
  const [promotion, setPromotion] = useState<Promotion | null>(null)

  useEffect(() => {
    // Cargar promoción activa
    const fetchPromotion = async () => {
      try {
        const response = await fetch("/api/promotions")
        const result = await response.json()

        if (result.success && result.data && result.data.length > 0) {
          const activePromotion = result.data.find((p: Promotion) => p.is_active)
          if (activePromotion && activePromotion.description) {
            setPromotion(activePromotion)
          }
        }
      } catch (error) {
        console.error("Error fetching promotion:", error)
      }
    }

    fetchPromotion()
  }, [])

  if (!promotion || !promotion.description) {
    return null
  }

  // Parsear la descripción y convertir iconos a componentes
  const parseDescription = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim())
    return lines.map((line, index) => {
      const trimmed = line.trim()
      
      // Detectar iconos comunes - usando regex más flexible para emojis
      // Checkmark (✔ ✓ ✅)
      if (/^[✔✓✅]/.test(trimmed)) {
        const text = trimmed.replace(/^[✔✓✅]\s*/, '').trim()
        return { type: 'check', text, icon: CheckCircle2 }
      } 
      // Lock/Arrow up (⬆ 🔒 🔐)
      else if (/^[⬆🔒🔐]/.test(trimmed)) {
        const text = trimmed.replace(/^[⬆🔒🔐]\s*/, '').trim()
        return { type: 'lock', text, icon: Lock }
      } 
      // Truck (🚚 🚛 🚗)
      else if (/^[🚚🚛🚗]/.test(trimmed)) {
        const text = trimmed.replace(/^[🚚🚛🚗]\s*/, '').trim()
        return { type: 'truck', text, icon: Truck }
      } 
      // Sparkle (✨ ⭐ 💫)
      else if (/^[✨⭐💫]/.test(trimmed)) {
        const text = trimmed.replace(/^[✨⭐💫]\s*/, '').trim()
        return { type: 'sparkle', text, icon: Sparkles }
      } 
      // Calendar (🗓️ 📅 📆)
      else if (/^[🗓️📅📆]/.test(trimmed)) {
        const text = trimmed.replace(/^[🗓️📅📆]\s*/, '').trim()
        return { type: 'calendar', text, icon: Calendar }
      } 
      // Texto sin icono
      else {
        return { type: 'text', text: trimmed, icon: null }
      }
    })
  }

  const parsedLines = parseDescription(promotion.description)

  // Función para determinar si un color es oscuro
  const isDarkColor = (hex: string): boolean => {
    if (!hex) return true
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const brightness = (r * 299 + g * 299 + b * 114) / 1000
    return brightness < 128
  }

  const isDark = isDarkColor(promotion.banner_color)
  const bgColor = isDark ? promotion.banner_color : `${promotion.banner_color}15`
  const textColor = isDark ? 'text-white' : 'text-foreground'
  const titleColor = isDark ? 'text-white' : promotion.banner_color

  return (
    <section className="container mx-auto px-4 py-12">
      <div 
        className="max-w-4xl mx-auto p-8 rounded-2xl border-2 shadow-lg"
        style={{ 
          borderColor: promotion.banner_color,
          backgroundColor: bgColor
        }}
      >
        {promotion.title && (
          <h2 
            className={`font-display text-3xl md:text-4xl font-bold mb-6 text-center ${titleColor}`}
          >
            {promotion.title}
          </h2>
        )}
        
        <div className={`space-y-4 text-base md:text-lg ${textColor}`}>
          {parsedLines.map((line, index) => {
            if (line.type === 'text') {
              return (
                <p key={index} className="font-medium leading-relaxed">
                  {line.text}
                </p>
              )
            }
            
            const Icon = line.icon
            const iconColors: Record<string, string> = {
              check: 'text-green-400',
              lock: 'text-blue-400',
              truck: 'text-orange-400',
              sparkle: 'text-yellow-400',
              calendar: 'text-purple-400',
            }
            
            return (
              <div key={index} className="flex items-start gap-3">
                {Icon && (
                  <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${iconColors[line.type] || 'text-primary'}`} />
                )}
                <p className="leading-relaxed flex-1">
                  {line.text}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}


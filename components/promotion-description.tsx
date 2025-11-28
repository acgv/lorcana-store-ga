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
      
      // Detectar iconos comunes (emojis pueden tener diferentes longitudes)
      // Checkmark
      if (trimmed.match(/^[✔✓]/)) {
        return { type: 'check', text: trimmed.replace(/^[✔✓]\s*/, '').trim(), icon: CheckCircle2 }
      } 
      // Lock/Arrow up
      else if (trimmed.match(/^[⬆🔒]/)) {
        return { type: 'lock', text: trimmed.replace(/^[⬆🔒]\s*/, '').trim(), icon: Lock }
      } 
      // Truck
      else if (trimmed.match(/^[🚚🚛]/)) {
        return { type: 'truck', text: trimmed.replace(/^[🚚🚛]\s*/, '').trim(), icon: Truck }
      } 
      // Sparkle
      else if (trimmed.match(/^[✨⭐]/)) {
        return { type: 'sparkle', text: trimmed.replace(/^[✨⭐]\s*/, '').trim(), icon: Sparkles }
      } 
      // Calendar
      else if (trimmed.match(/^[🗓️📅]/)) {
        return { type: 'calendar', text: trimmed.replace(/^[🗓️📅]\s*/, '').trim(), icon: Calendar }
      } 
      // Texto sin icono
      else {
        return { type: 'text', text: trimmed, icon: null }
      }
    })
  }

  const parsedLines = parseDescription(promotion.description)

  return (
    <section className="container mx-auto px-4 py-12">
      <div 
        className="max-w-4xl mx-auto p-8 rounded-2xl border-2 shadow-lg"
        style={{ 
          borderColor: promotion.banner_color,
          backgroundColor: `${promotion.banner_color}10`
        }}
      >
        {promotion.title && (
          <h2 
            className="font-display text-3xl md:text-4xl font-bold mb-6 text-center"
            style={{ color: promotion.banner_color }}
          >
            {promotion.title}
          </h2>
        )}
        
        <div className="space-y-4 text-base md:text-lg">
          {parsedLines.map((line, index) => {
            if (line.type === 'text') {
              return (
                <p key={index} className="text-foreground font-medium leading-relaxed">
                  {line.text}
                </p>
              )
            }
            
            const Icon = line.icon
            const iconColors: Record<string, string> = {
              check: 'text-green-500',
              lock: 'text-blue-500',
              truck: 'text-orange-500',
              sparkle: 'text-yellow-500',
              calendar: 'text-purple-500',
            }
            
            return (
              <div key={index} className="flex items-start gap-3">
                {Icon && (
                  <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${iconColors[line.type] || 'text-primary'}`} />
                )}
                <p className="text-foreground leading-relaxed flex-1">
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


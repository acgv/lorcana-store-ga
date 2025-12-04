"use client"

import { useEffect, useCallback, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import {
  trackPageView,
  trackSectionView,
  trackEvent,
  type AnalyticsEvent,
  type AnalyticsProperties,
} from "@/lib/analytics"
import { supabase } from "@/lib/db"

/**
 * Hook para facilitar el tracking de analytics
 * 
 * Uso:
 * ```tsx
 * const { track, trackSection } = useAnalytics()
 * 
 * // Trackear un evento
 * track('cart_add', { cardId: '123', price: 10 })
 * 
 * // Trackear una sección
 * trackSection('catalog', { filterType: 'rarity' })
 * ```
 */
export function useAnalytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<{ id: string; role?: string } | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Obtener información del usuario (de forma asíncrona y no bloqueante)
  useEffect(() => {
    if (!supabase) return

    let subscription: { unsubscribe: () => void } | null = null
    let timeoutId: ReturnType<typeof setTimeout> | number | null = null

    // Usar requestIdleCallback para no bloquear el renderizado inicial
    const loadAuth = () => {
      // Obtener sesión actual de forma asíncrona
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            role: session.user.user_metadata?.role,
          })
          setIsAuthenticated(true)
        } else {
          setUser(null)
          setIsAuthenticated(false)
        }
      }).catch(() => {
        // Silenciar errores de autenticación para no bloquear
        setUser(null)
        setIsAuthenticated(false)
      })

      // Escuchar cambios en la autenticación
      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            role: session.user.user_metadata?.role,
          })
          setIsAuthenticated(true)
        } else {
          setUser(null)
          setIsAuthenticated(false)
        }
      })
      
      subscription = authSubscription
    }

    // Usar requestIdleCallback si está disponible, sino setTimeout
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      timeoutId = window.requestIdleCallback(loadAuth, { timeout: 1000 })
    } else {
      timeoutId = setTimeout(loadAuth, 100)
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
      if (timeoutId) {
        if (typeof timeoutId === 'number') {
          clearTimeout(timeoutId)
        } else if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
          window.cancelIdleCallback(timeoutId)
        }
      }
    }
  }, [])

  // Trackear automáticamente cambios de página
  useEffect(() => {
    if (pathname) {
      const page = pathname
      const query = searchParams?.toString()
      const fullPath = query ? `${page}?${query}` : page

      trackPageView(fullPath, {
        userId: user?.id,
        isAuthenticated,
        userRole: user?.role,
      })
    }
  }, [pathname, searchParams, user, isAuthenticated])

  // Función helper para trackear eventos
  const track = useCallback(
    (event: AnalyticsEvent, properties?: AnalyticsProperties) => {
      trackEvent(event, {
        ...properties,
        userId: user?.id,
        isAuthenticated,
        userRole: user?.role,
        page: pathname,
      })
    },
    [user, isAuthenticated, pathname]
  )

  // Función helper para trackear secciones
  const trackSection = useCallback(
    (section: string, properties?: Omit<AnalyticsProperties, "section">) => {
      trackSectionView(section, {
        ...properties,
        userId: user?.id,
        isAuthenticated,
        userRole: user?.role,
        page: pathname,
      })
    },
    [user, isAuthenticated, pathname]
  )

  return {
    track,
    trackSection,
    user,
    isAuthenticated,
  }
}


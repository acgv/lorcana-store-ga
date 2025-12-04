"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { CallBackProps, STATUS, Step } from "react-joyride"
import { useUser } from "@/hooks/use-user"
import { useAuth } from "@/hooks/use-auth"
import { useLanguage } from "@/components/language-provider"

const TOUR_STORAGE_KEY = "lorcana_tour_completed"

// Cargar Joyride dinámicamente solo en el cliente para evitar problemas de hidratación
const Joyride = dynamic(() => import("react-joyride").then((mod) => mod.default), {
  ssr: false,
})

export function GuidedTour() {
  const { t } = useLanguage()
  const { user, isAdmin: isUserAdmin } = useUser()
  const { isAdmin: isAdminAuth } = useAuth()
  const [runTour, setRunTour] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const isAdmin = isUserAdmin || isAdminAuth

  // Asegurar que solo se ejecute en el cliente
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Verificar si el usuario ya completó el tour
  useEffect(() => {
    if (!isMounted || typeof window === "undefined") {
      console.log("🔍 Tour: Esperando montaje o no hay window")
      return
    }
    
    console.log("🔍 Tour: Verificando condiciones...", { isAdmin, user: !!user })
    
    // No mostrar tour a admins
    if (isAdmin) {
      console.log("🚫 Tour: Usuario es admin, no mostrar tour")
      setRunTour(false)
      return
    }

    // Verificar si ya completó el tour
    const tourCompleted = localStorage.getItem(TOUR_STORAGE_KEY)
    console.log("🔍 Tour: Estado completado:", tourCompleted)
    
    // Si no ha completado el tour, iniciarlo después de un breve delay
    if (!tourCompleted) {
      console.log("✅ Tour: No completado, intentando iniciar...")
      
      // Función para verificar elementos y iniciar tour
      const checkAndStartTour = () => {
        // Verificar que los elementos del tour existan antes de iniciar
        // Usar logo como elemento principal (siempre visible)
        const logoEl = document.querySelector('[data-tour="logo"]')
        const catalogEl = document.querySelector('[data-tour="catalog"]')
        const navigationEl = document.querySelector('[data-tour="navigation"]')
        
        console.log("🔍 Tour: Buscando elementos...", {
          logo: !!logoEl,
          catalog: !!catalogEl,
          navigation: !!navigationEl,
        })
        
        // Solo necesitamos el logo para iniciar (siempre está visible)
        // Si no encontramos el logo, intentar con cualquier elemento
        if (logoEl) {
          console.log("✅ Tour: Elemento logo encontrado, iniciando tour...")
          setRunTour(true)
          return true
        } else if (catalogEl || navigationEl) {
          // Si no hay logo pero hay otros elementos, iniciar de todas formas
          console.log("✅ Tour: Elementos alternativos encontrados, iniciando tour...")
          setRunTour(true)
          return true
        }
        return false
      }
      
      // Intentar inmediatamente
      if (checkAndStartTour()) {
        return
      }
      
      // Si no se encontraron, esperar y reintentar
      let attempts = 0
      const maxAttempts = 20 // Aumentado a 20 intentos
      const checkInterval = setInterval(() => {
        attempts++
        console.log(`🔍 Tour: Intento ${attempts}/${maxAttempts}`)
        if (checkAndStartTour() || attempts >= maxAttempts) {
          clearInterval(checkInterval)
          if (attempts >= maxAttempts) {
            console.warn("⚠️ Tour: No se encontraron elementos después de", maxAttempts, "intentos")
          }
        }
      }, 500)
      
      // También intentar después de un delay más largo
      const timer = setTimeout(() => {
        console.log("🔍 Tour: Timeout de 5 segundos alcanzado")
        clearInterval(checkInterval)
        checkAndStartTour()
      }, 5000) // Aumentado a 5 segundos
      
      return () => {
        clearTimeout(timer)
        clearInterval(checkInterval)
      }
    } else {
      console.log("⏭️ Tour: Ya completado anteriormente")
    }
  }, [isMounted, isAdmin, user])

  // Pasos del tour - dinámicos según si el usuario está logueado
  // Solo calcular pasos cuando esté montado para evitar problemas de hidratación
  const steps: Step[] = isMounted ? [
    {
      target: '[data-tour="logo"]',
      content: t("tourNavigation") || "Aquí puedes explorar productos de Lorcana. Navega por el catálogo, productos y más.",
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: '[data-tour="catalog"]',
      content: t("tourCatalog") || "Explora nuestro catálogo completo de cartas Lorcana con precios actualizados.",
      placement: "bottom",
    },
    // Solo mostrar paso de login si el usuario no está logueado
    ...(!user ? [{
      target: '[data-tour="login"]',
      content: t("tourLogin") || "Para guardar tus cartas y crear colecciones, inicia sesión aquí. Es gratis y rápido.",
      placement: "left",
    }] : []),
    // Solo mostrar paso de colección si el usuario está logueado
    ...(user ? [{
      target: '[data-tour="collection"]',
      content: t("tourCollection") || "En 'Mi Colección' verás tus cartas guardadas, valores y listas personalizadas.",
      placement: "left",
    }] : []),
  ] : []

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data
    console.log("🔍 Tour: Callback", { status, action, index, type })
    
    // Si el tour se completó o se cerró, guardar en localStorage
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      console.log("✅ Tour: Completado o omitido, guardando en localStorage")
      localStorage.setItem(TOUR_STORAGE_KEY, "true")
      setRunTour(false)
    }
  }

  // Exponer funciones globales para debugging
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__startTour = () => {
        console.log("🔧 Tour: Forzando inicio del tour manualmente")
        localStorage.removeItem(TOUR_STORAGE_KEY)
        setRunTour(true)
      }
      (window as any).__resetTour = () => {
        console.log("🔧 Tour: Reseteando tour")
        localStorage.removeItem(TOUR_STORAGE_KEY)
        setRunTour(false)
        setTimeout(() => setRunTour(true), 500)
      }
      (window as any).__checkTourElements = () => {
        const logoEl = document.querySelector('[data-tour="logo"]')
        const catalogEl = document.querySelector('[data-tour="catalog"]')
        const loginEl = document.querySelector('[data-tour="login"]')
        console.log("🔍 Tour: Elementos encontrados", {
          logo: !!logoEl,
          catalog: !!catalogEl,
          login: !!loginEl,
        })
        return { logo: !!logoEl, catalog: !!catalogEl, login: !!loginEl }
      }
    }
  }, [])

  // No renderizar nada hasta que esté montado en el cliente
  if (!isMounted) {
    console.log("🔍 Tour: No montado aún")
    return null
  }

  // No mostrar tour a admins
  if (isAdmin) {
    console.log("🔍 Tour: Usuario es admin, no renderizar")
    return null
  }

  // Verificar que tengamos pasos
  if (steps.length === 0) {
    console.warn("⚠️ Tour: No hay pasos definidos")
    return null
  }

  console.log("🔍 Tour: Renderizando Joyride", {
    stepsCount: steps.length,
    runTour,
    isMounted,
    isAdmin,
    steps: steps.map(s => ({ target: s.target, content: s.content?.substring(0, 50) })),
  })

  return (
    <Joyride
      steps={steps}
      run={runTour}
      continuous={true}
      showProgress={true}
      showSkipButton={true}
      callback={handleJoyrideCallback}
      disableOverlayClose={false}
      disableScrolling={false}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          textColor: "hsl(var(--foreground))",
          backgroundColor: "hsl(var(--card))",
          overlayColor: "rgba(0, 0, 0, 0.85)",
          arrowColor: "hsl(var(--card))",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: "16px",
          padding: "28px",
          backgroundColor: "hsl(var(--card))",
          border: "3px solid hsl(var(--primary))",
          boxShadow: "0 25px 80px rgba(0, 0, 0, 0.9), 0 0 40px rgba(139, 92, 246, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
          maxWidth: "420px",
          backdropFilter: "blur(20px)",
        },
        tooltipContainer: {
          textAlign: "left",
        },
        tooltipTitle: {
          fontSize: "18px",
          fontWeight: "700",
          marginBottom: "8px",
          color: "hsl(var(--foreground))",
        },
        tooltipContent: {
          fontSize: "16px",
          lineHeight: "1.7",
          color: "hsl(var(--foreground))",
          padding: "0",
          marginBottom: "20px",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
          borderRadius: "10px",
          padding: "12px 28px",
          fontSize: "15px",
          fontWeight: "700",
          border: "none",
          boxShadow: "0 6px 20px rgba(139, 92, 246, 0.6), 0 2px 8px rgba(139, 92, 246, 0.4)",
          transition: "all 0.2s",
          cursor: "pointer",
          textTransform: "none",
        },
        buttonBack: {
          color: "hsl(var(--foreground))",
          marginRight: "12px",
          fontSize: "15px",
          fontWeight: "600",
          backgroundColor: "hsl(var(--muted))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "10px",
          padding: "12px 24px",
          cursor: "pointer",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
          fontSize: "15px",
          fontWeight: "600",
          backgroundColor: "transparent",
          cursor: "pointer",
        },
        spotlight: {
          borderRadius: "8px",
        },
        beacon: {
          inner: {
            backgroundColor: "hsl(var(--primary))",
            border: "3px solid hsl(var(--primary-foreground))",
          },
          outer: {
            border: "3px solid hsl(var(--primary))",
            animation: "joyride-beacon-inner 1.2s infinite ease-in-out",
          },
        },
      }}
      locale={{
        back: t("back") || "Atrás",
        close: t("close") || "Cerrar",
        last: t("finish") || "Finalizar",
        next: t("next") || "Siguiente",
        skip: t("skip") || "Omitir",
      }}
    />
  )
}


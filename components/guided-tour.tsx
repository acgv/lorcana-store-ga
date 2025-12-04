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
    if (!isMounted || typeof window === "undefined") return
    
    // No mostrar tour a admins
    if (isAdmin) {
      setRunTour(false)
      return
    }

    // Verificar si ya completó el tour
    const tourCompleted = localStorage.getItem(TOUR_STORAGE_KEY)
    
    // Si no ha completado el tour, iniciarlo después de un breve delay
    if (!tourCompleted) {
      // Esperar a que la página cargue completamente y los elementos estén disponibles
      const timer = setTimeout(() => {
        // Verificar que los elementos del tour existan antes de iniciar
        const navigationEl = document.querySelector('[data-tour="navigation"]')
        if (navigationEl) {
          setRunTour(true)
        }
      }, 1500)
      
      return () => clearTimeout(timer)
    }
  }, [isMounted, isAdmin, user])

  // Pasos del tour - dinámicos según si el usuario está logueado
  // Solo calcular pasos cuando esté montado para evitar problemas de hidratación
  const steps: Step[] = isMounted ? [
    {
      target: '[data-tour="navigation"]',
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
    const { status } = data
    
    // Si el tour se completó o se cerró, guardar en localStorage
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem(TOUR_STORAGE_KEY, "true")
      setRunTour(false)
    }
  }

  // No renderizar nada hasta que esté montado en el cliente
  if (!isMounted) {
    return null
  }

  // No mostrar tour a admins
  if (isAdmin) {
    return null
  }

  return (
    <Joyride
      steps={steps}
      run={runTour}
      continuous={true}
      showProgress={true}
      showSkipButton={true}
      callback={handleJoyrideCallback}
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


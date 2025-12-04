"use client"

import { useEffect, useState } from "react"
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride"
import { useUser } from "@/hooks/use-user"
import { useAuth } from "@/hooks/use-auth"
import { useLanguage } from "@/components/language-provider"

const TOUR_STORAGE_KEY = "lorcana_tour_completed"

export function GuidedTour() {
  const { t } = useLanguage()
  const { user, isAdmin: isUserAdmin } = useUser()
  const { isAdmin: isAdminAuth } = useAuth()
  const [runTour, setRunTour] = useState(false)

  const isAdmin = isUserAdmin || isAdminAuth

  // Verificar si el usuario ya completó el tour
  useEffect(() => {
    if (typeof window === "undefined") return
    
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
  }, [isAdmin, user])

  // Pasos del tour - dinámicos según si el usuario está logueado
  const steps: Step[] = [
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
  ]

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data
    
    // Si el tour se completó o se cerró, guardar en localStorage
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem(TOUR_STORAGE_KEY, "true")
      setRunTour(false)
    }
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
          backgroundColor: "hsl(var(--background))",
          overlayColor: "rgba(0, 0, 0, 0.5)",
          arrowColor: "hsl(var(--background))",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: "8px",
          padding: "20px",
        },
        tooltipContainer: {
          textAlign: "left",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
          borderRadius: "6px",
          padding: "8px 16px",
          fontSize: "14px",
          fontWeight: "500",
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
          marginRight: "8px",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
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


"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { CallBackProps, STATUS, Step } from "react-joyride"
import { useUser } from "@/hooks/use-user"
import { useAuth } from "@/hooks/use-auth"
import { useLanguage } from "@/components/language-provider"

const TOUR_STORAGE_KEY = "lorcana_tour_completed"

// Log inmediato cuando se carga el módulo - FORZAR LOG
console.log("📦 Tour: Módulo cargado (siempre)")

// Cargar Joyride dinámicamente solo en el cliente para evitar problemas de hidratación
const Joyride = dynamic(() => {
  console.log("📦 Tour: Cargando Joyride dinámicamente...")
  return import("react-joyride").then((mod) => {
    console.log("✅ Tour: Joyride cargado exitosamente")
    return mod.default
  }).catch((err) => {
    console.error("❌ Tour: Error cargando Joyride", err)
    throw err
  })
}, {
  ssr: false,
})

export function GuidedTour() {
  // Log inmediato al renderizar - FORZAR LOG
  console.log("🚀 Tour: Componente renderizado (siempre)")
  
  const { t } = useLanguage()
  const { user, isAdmin: isUserAdmin } = useUser()
  const { isAdmin: isAdminAuth } = useAuth()
  const [runTour, setRunTour] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const isAdmin = isUserAdmin || isAdminAuth
  
  // Log del estado inicial
  console.log("🚀 Tour: Estado inicial", { isAdmin, user: !!user, isMounted, runTour })

  // Asegurar que solo se ejecute en el cliente
  useEffect(() => {
    console.log("🚀 Tour: useEffect de montaje ejecutado")
    setIsMounted(true)
  }, [])

  // Verificar si el usuario ya completó el tour e iniciar automáticamente
  useEffect(() => {
    console.log("🔍 Tour: useEffect principal ejecutado", { isMounted, isAdmin, runTour })
    
    if (!isMounted || typeof window === "undefined") {
      console.log("⏸️ Tour: Esperando montaje")
      return
    }
    
    // No mostrar tour a admins
    if (isAdmin) {
      console.log("🚫 Tour: Usuario es admin")
      setRunTour(false)
      return
    }

    // Verificar si ya completó el tour
    const tourCompleted = localStorage.getItem(TOUR_STORAGE_KEY)
    console.log("🔍 Tour: Estado completado en localStorage:", tourCompleted)
    
    // Si no ha completado el tour, iniciarlo después de un breve delay
    if (!tourCompleted) {
      console.log("✅ Tour: No completado, programando inicio...")
      
      // Iniciar el tour después de 2 segundos, sin verificar elementos
      const timer = setTimeout(() => {
        console.log("🚀 Tour: Iniciando tour automáticamente")
        setRunTour(true)
      }, 2000)
      
      return () => {
        console.log("🧹 Tour: Limpiando timer")
        clearTimeout(timer)
      }
    } else {
      console.log("⏭️ Tour: Ya completado anteriormente")
    }
  }, [isMounted, isAdmin])

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


  // Debug: Log del estado actual
  console.log("🔍 Tour: Estado actual", {
    isMounted,
    isAdmin,
    runTour,
    stepsLength: steps.length,
    user: !!user,
  })

  // No renderizar nada hasta que esté montado en el cliente
  if (!isMounted) {
    console.log("🔍 Tour: No montado aún, esperando...")
    return <div style={{ display: 'none' }} data-tour-debug="not-mounted">Tour not mounted</div>
  }

  // No mostrar tour a admins
  if (isAdmin) {
    console.log("🔍 Tour: Usuario es admin, no renderizar")
    return <div style={{ display: 'none' }} data-tour-debug="is-admin">Tour: User is admin</div>
  }

  // Verificar que tengamos pasos
  if (steps.length === 0) {
    console.warn("⚠️ Tour: No hay pasos definidos")
    return <div style={{ display: 'none' }} data-tour-debug="no-steps">Tour: No steps</div>
  }

  console.log("🔍 Tour: Renderizando Joyride", {
    stepsCount: steps.length,
    runTour,
    isMounted,
    isAdmin,
    steps: steps.map(s => ({ target: s.target, content: s.content?.substring(0, 50) })),
  })

  return (
    <>
      {/* Debug element siempre visible - FORZAR VISIBILIDAD */}
      <div 
        style={{ 
          position: 'fixed', 
          bottom: 10, 
          right: 10, 
          background: 'red', 
          color: 'white', 
          padding: '10px 15px', 
          fontSize: '14px',
          zIndex: 99999,
          cursor: 'pointer',
          borderRadius: '4px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
        onClick={() => {
          console.log("🔧 Tour: Click en debug, forzando inicio")
          localStorage.removeItem(TOUR_STORAGE_KEY)
          setRunTour(true)
        }}
      >
        🎯 Tour: {isMounted ? 'M' : 'NM'} | {runTour ? 'R' : 'S'} | {isAdmin ? 'A' : 'U'} | S:{steps.length}
      </div>
      {isMounted && !isAdmin && steps.length > 0 && (
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
      )}
    </>
  )
}


"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "light" | "dark"
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Cargar tema guardado o usar system
    const savedTheme = localStorage.getItem("theme") as Theme | null
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      // Detectar preferencia del sistema
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      setTheme(systemPrefersDark ? "dark" : "light")
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    
    // Remover clase dark (light es el default en :root)
    root.classList.remove("dark")
    
    // Aplicar tema
    if (theme === "system") {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      if (systemPrefersDark) {
        root.classList.add("dark")
      }
    } else if (theme === "dark") {
      root.classList.add("dark")
    }
    // Si theme === "light", no agregamos clase (usa :root que es light)
    
    // Guardar preferencia
    localStorage.setItem("theme", theme)
  }, [theme, mounted])

  const resolvedTheme: "light" | "dark" = 
    theme === "system" 
      ? (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme

  // Evitar flash de tema incorrecto
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    // Durante SSR, retornar valores por defecto en vez de error
    return {
      theme: "dark" as Theme,
      setTheme: () => {},
      resolvedTheme: "dark" as const,
    }
  }
  return context
}

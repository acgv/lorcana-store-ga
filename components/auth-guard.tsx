"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  
  // Verificar token sincronamente para evitar doble loading
  const getToken = () => {
    if (typeof window === "undefined") return null
    const localToken = localStorage.getItem("admin_token")
    const cookieToken = document.cookie
      .split("; ")
      .find(row => row.startsWith("admin_token="))
      ?.split("=")[1]
    return localToken || cookieToken
  }

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getToken())

  useEffect(() => {
    const token = getToken()
    
    if (!token) {
      // No hay token, redirigir a login
      const loginUrl = `/admin/login?redirect=${encodeURIComponent(pathname)}`
      router.push(loginUrl)
      setIsAuthenticated(false)
    } else {
      // Hay token, permitir acceso
      setIsAuthenticated(true)
    }
  }, [router, pathname])

  // Si no autenticado, no mostrar nada (está redirigiendo)
  if (!isAuthenticated) {
    return null
  }

  // Si autenticado, mostrar contenido directamente (sin loading extra)
  return <>{children}</>
}


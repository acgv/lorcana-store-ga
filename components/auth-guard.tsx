"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading: userLoading, isAdmin: isGoogleAdmin } = useUser()
  
  // Verificar token de admin tradicional
  const getToken = () => {
    if (typeof window === "undefined") return null
    const localToken = localStorage.getItem("admin_token")
    const cookieToken = document.cookie
      .split("; ")
      .find(row => row.startsWith("admin_token="))
      ?.split("=")[1]
    return localToken || cookieToken
  }

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // Wait for user loading to complete
    if (userLoading) return

    const token = getToken()
    
    // User is authenticated if:
    // 1. They have an admin token (traditional login) OR
    // 2. They're logged in with Google AND have admin role
    const isAuth = !!token || (!!user && isGoogleAdmin)
    
    if (!isAuth) {
      // Not authenticated, redirect to admin login
      const loginUrl = `/admin/login?redirect=${encodeURIComponent(pathname)}`
      router.push(loginUrl)
      setIsAuthenticated(false)
    } else {
      // Authenticated, allow access
      setIsAuthenticated(true)
    }
  }, [router, pathname, user, userLoading, isGoogleAdmin])

  // Show loading while checking authentication
  if (isAuthenticated === null || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // If not authenticated, don't show content (redirecting)
  if (!isAuthenticated) {
    return null
  }

  // If authenticated, show content
  return <>{children}</>
}


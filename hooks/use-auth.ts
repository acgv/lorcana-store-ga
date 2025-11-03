import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/db"

interface User {
  id: string
  email: string
}

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    // Verificar token en localStorage o cookies
    const localToken = localStorage.getItem("admin_token")
    const cookieToken = document.cookie
      .split("; ")
      .find(row => row.startsWith("admin_token="))
      ?.split("=")[1]
    
    const token = localToken || cookieToken
    
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    // Validar token con Supabase Auth
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.getUser(token)
        
        if (error || !data.user) {
          console.log("Token inválido o expirado, limpiando sesión")
          localStorage.removeItem("admin_token")
          setUser(null)
        } else {
          setUser({
            id: data.user.id,
            email: data.user.email!,
          })
        }
      } catch (err) {
        console.error("Error validando token:", err)
        localStorage.removeItem("admin_token")
        setUser(null)
      }
    } else {
      // Si Supabase no está configurado, limpiar sesión
      console.warn("Supabase no configurado, no se puede validar token")
      localStorage.removeItem("admin_token")
      setUser(null)
    }
    
    setLoading(false)
  }

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (data.success) {
      localStorage.setItem("admin_token", data.token)
      setUser(data.user)
      return { success: true }
    }

    return { success: false, error: data.error }
  }

  const logout = () => {
    localStorage.removeItem("admin_token")
    // Eliminar cookie también
    document.cookie = "admin_token=; path=/; max-age=0"
    setUser(null)
    router.push("/admin/login")
  }

  const isAuthenticated = () => {
    return !!user
  }

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated,
    checkAuth,
  }
}


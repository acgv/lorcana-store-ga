import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

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

    // ✅ Validar token con nuestra API custom (no con Supabase Auth)
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success && data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
        })
      } else {
        console.log("Token inválido o expirado, limpiando sesión")
        localStorage.removeItem("admin_token")
        document.cookie = "admin_token=; path=/; max-age=0"
        setUser(null)
      }
    } catch (err) {
      console.error("Error validando token:", err)
      localStorage.removeItem("admin_token")
      document.cookie = "admin_token=; path=/; max-age=0"
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


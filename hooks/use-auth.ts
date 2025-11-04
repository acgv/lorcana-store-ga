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

    // ✅ Simple token check - if exists, consider authenticated
    // The actual token validation happens on API routes (server-side)
    try {
      // Decode JWT to get user info (basic check, no cryptographic validation)
      const tokenParts = token.split('.')
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]))
        
        // Check if token is expired
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          console.log("Token expired, clearing session")
          localStorage.removeItem("admin_token")
          document.cookie = "admin_token=; path=/; max-age=0"
          setUser(null)
        } else {
          // Token is valid (not expired), set user
          setUser({
            id: payload.sub || payload.user_id || "admin",
            email: payload.email || "admin",
          })
        }
      } else {
        // Invalid token format
        localStorage.removeItem("admin_token")
        document.cookie = "admin_token=; path=/; max-age=0"
        setUser(null)
      }
    } catch (err) {
      // Error parsing token - treat as invalid
      console.log("Invalid token format, clearing session")
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


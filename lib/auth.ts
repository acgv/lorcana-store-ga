import { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/db"

// Verificar que el usuario es admin
export async function verifyAdmin(
  request: NextRequest
): Promise<{ success: boolean; error?: string; status?: number; response?: any }> {
  try {
    // Obtener token de sesión del header Authorization
    const authHeader = request.headers.get("Authorization")
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // Si no hay token, verificar si hay cookie de sesión
      const cookies = request.cookies
      const sessionToken = cookies.get("sb-access-token")?.value || 
                          cookies.get("supabase-auth-token")?.value
      
      if (!sessionToken) {
        return { 
          success: false, 
          error: "No authentication token", 
          status: 401,
          response: null
        }
      }

      // Verificar token de cookie
      if (!supabaseAdmin) {
        return { 
          success: false, 
          error: "Auth service not configured", 
          status: 503,
          response: null
        }
      }

      const { data, error } = await supabaseAdmin.auth.getUser(sessionToken)
      if (error || !data.user) {
        return { 
          success: false, 
          error: "Invalid token", 
          status: 401,
          response: null
        }
      }

      // Verificar rol admin
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .single()

      if (!roleData || roleData.role !== "admin") {
        return { 
          success: false, 
          error: "Admin role required", 
          status: 403,
          response: null
        }
      }

      return { success: true }
    }

    const token = authHeader.replace("Bearer ", "")
    
    if (!supabaseAdmin) {
      return { 
        success: false, 
        error: "Auth service not configured", 
        status: 503,
        response: null
      }
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data.user) {
      return { 
        success: false, 
        error: "Invalid token", 
        status: 401,
        response: null
      }
    }

    // Verificar rol admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .single()

    if (!roleData || roleData.role !== "admin") {
      return { 
        success: false, 
        error: "Admin role required", 
        status: 403,
        response: null
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error verifying admin:", error)
    return { 
      success: false, 
      error: "Internal error", 
      status: 500,
      response: null
    }
  }
}


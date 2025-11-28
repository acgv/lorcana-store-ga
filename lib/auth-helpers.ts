/**
 * Authentication Helpers for API Routes
 * 
 * Utilidades para verificar autenticación en API routes de Next.js
 */

import { NextRequest } from "next/server"
import { supabaseAdmin } from "./db"
import type { User } from "@supabase/supabase-js"

export interface AuthResult {
  success: true
  user: User
  userId: string
  email: string
}

export interface AuthError {
  success: false
  error: string
  status: number
}

export type AuthResponse = AuthResult | AuthError

/**
 * Verificar sesión de Supabase desde un API route
 * 
 * @param request - NextRequest del API route
 * @returns AuthResponse con usuario o error
 * 
 * @example
 * const auth = await verifySupabaseSession(request)
 * if (!auth.success) {
 *   return NextResponse.json({ error: auth.error }, { status: auth.status })
 * }
 * // Usar auth.user, auth.userId, auth.email
 */
export async function verifySupabaseSession(
  request: NextRequest
): Promise<AuthResponse> {
  try {
    // Obtener token del header Authorization
    const authHeader = request.headers.get("Authorization")
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        success: false,
        error: "No authorization token provided",
        status: 401,
      }
    }

    const token = authHeader.replace("Bearer ", "")

    if (!supabaseAdmin) {
      return {
        success: false,
        error: "Authentication service not configured",
        status: 503,
      }
    }

    // Verificar token con Supabase
    const { data, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !data.user) {
      return {
        success: false,
        error: "Invalid or expired token",
        status: 401,
      }
    }

    return {
      success: true,
      user: data.user,
      userId: data.user.id,
      email: data.user.email || "",
    }
  } catch (error) {
    console.error("Error verifying session:", error)
    return {
      success: false,
      error: "Internal authentication error",
      status: 500,
    }
  }
}

/**
 * Verificar que el usuario tiene rol de admin
 * 
 * @param userId - ID del usuario
 * @returns true si es admin, false si no
 */
export async function verifyAdminRole(userId: string): Promise<boolean> {
  try {
    if (!supabaseAdmin) return false

    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single()

    if (error || !data) return false

    return data.role === "admin"
  } catch (error) {
    console.error("Error checking admin role:", error)
    return false
  }
}

/**
 * Verificar sesión y rol de admin en un solo paso
 * 
 * @param request - NextRequest del API route
 * @returns AuthResponse con usuario o error
 */
export async function verifyAdminSession(
  request: NextRequest
): Promise<AuthResponse> {
  const auth = await verifySupabaseSession(request)
  
  if (!auth.success) {
    return auth
  }

  const isAdmin = await verifyAdminRole(auth.userId)
  
  if (!isAdmin) {
    return {
      success: false,
      error: "Unauthorized - Admin role required",
      status: 403,
    }
  }

  return auth
}

/**
 * Obtener token de sesión desde diferentes fuentes
 * 
 * Intenta obtener el token desde:
 * 1. Header Authorization (Bearer token)
 * 2. Cookie (si está disponible)
 * 
 * @param request - NextRequest del API route
 * @returns Token o null
 */
export function getSessionToken(request: NextRequest): string | null {
  // Intentar desde header Authorization
  const authHeader = request.headers.get("Authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "")
  }

  // Intentar desde cookie (si Supabase guarda la sesión en cookies)
  const cookies = request.cookies
  const accessToken = cookies.get("sb-access-token")?.value || 
                     cookies.get("supabase-auth-token")?.value
  
  return accessToken || null
}


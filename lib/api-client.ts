/**
 * API Client Helper
 * 
 * Utilidades para hacer peticiones a las APIs con autenticación automática
 */

import { supabase } from "./db"

/**
 * Obtener token de sesión de Supabase
 */
export async function getSessionToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  } catch (error) {
    console.error("Error getting session token:", error)
    return null
  }
}

/**
 * Hacer petición autenticada a una API
 * 
 * @param url - URL del endpoint
 * @param options - Opciones de fetch (se agregará automáticamente el token)
 * @returns Response de la petición
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getSessionToken()
  
  const headers = new Headers(options.headers)
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }
  
  return fetch(url, {
    ...options,
    headers,
  })
}


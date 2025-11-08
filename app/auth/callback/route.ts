import { NextResponse, type NextRequest } from "next/server"
import { supabase } from "@/lib/db"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const redirect = requestUrl.searchParams.get("redirect") || "/" // ⭐ Default: home

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Detectar el origen real de donde vino la petición
  const referer = request.headers.get("referer")
  const isLocalhost = requestUrl.hostname.includes("localhost") || 
                      requestUrl.hostname.includes("127.0.0.1") ||
                      referer?.includes("localhost")

  // Determinar el origen correcto
  let targetOrigin = requestUrl.origin
  
  if (isLocalhost) {
    // Si es localhost, mantener localhost
    targetOrigin = "http://localhost:3002"
  } else if (requestUrl.hostname.includes("vercel.app")) {
    // Si es Vercel, usar gacompany.cl
    targetOrigin = "https://www.gacompany.cl"
  } else {
    // Si ya es gacompany.cl, mantenerlo
    targetOrigin = requestUrl.origin
  }

  console.log("🔄 OAuth Callback:", {
    from: requestUrl.origin,
    referer,
    isLocalhost,
    targetOrigin,
    redirect,
  })

  // Redirect to the specified page with correct origin
  return NextResponse.redirect(new URL(redirect, targetOrigin))
}


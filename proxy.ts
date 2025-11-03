import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Rutas públicas que no requieren auth
  const publicPaths = [
    "/",
    "/catalog",
    "/card",
    "/about",
    "/news",
    "/contact",
    "/privacy",
    "/api/cards", // Lectura pública
  ]

  // Redirigir /admin a /admin/inventory por defecto
  if (path === "/admin") {
    return NextResponse.redirect(new URL("/admin/inventory", request.url))
  }

  // Rutas de admin que necesitan protección
  const isAdminPath = path.startsWith("/admin")
  const isAdminLoginPath = path.startsWith("/admin/login")
  const isAdminApiPath = path.startsWith("/api/inventory") || 
                         path.startsWith("/api/submissions") ||
                         path.startsWith("/api/logs")

  // Permitir acceso a /admin/login sin auth
  if (isAdminLoginPath) {
    return NextResponse.next()
  }

  // Verificar autenticación para rutas de admin
  if (isAdminPath || isAdminApiPath) {
    // Obtener token de headers o cookies
    const token = request.headers.get("authorization")?.replace("Bearer ", "") ||
                  request.cookies.get("admin_token")?.value

    // Si no hay token, redirigir a login
    if (!token) {
      // Para rutas de página, redirigir a login
      if (isAdminPath) {
        const loginUrl = new URL("/admin/login", request.url)
        loginUrl.searchParams.set("redirect", path)
        return NextResponse.redirect(loginUrl)
      }
      
      // Para rutas de API, retornar 401
      if (isAdminApiPath) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        )
      }
    }

    // TODO: Validar token con Supabase Auth
    // Por ahora, permitir si existe token
    // En producción, verifica el token contra Supabase:
    // const { data, error } = await supabase.auth.getUser(token)
    // if (error) return redirect to login
  }

  return NextResponse.next()
}

// Configurar qué rutas procesan este proxy
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}


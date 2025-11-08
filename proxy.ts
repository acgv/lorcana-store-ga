import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const hostname = request.headers.get("host") || ""
  const url = request.nextUrl.clone()
  const path = request.nextUrl.pathname

  // ═══════════════════════════════════════════════════════════════
  // DOMAIN REDIRECT: Vercel.app → gacompany.cl (SKIP localhost)
  // ═══════════════════════════════════════════════════════════════
  const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1")
  
  // NEVER redirect localhost
  if (!isLocalhost) {
    const vercelDomains = [
      "lorcana-store-ga.vercel.app",
      "lorcana-store-ga-git-master-acgvs-projects.vercel.app",
    ]

    const isVercelDomain = vercelDomains.some((domain) => hostname.includes(domain))

    if (isVercelDomain && !hostname.includes("gacompany.cl")) {
      // Redirect to custom domain (preserves path and query params)
      url.host = "www.gacompany.cl"
      url.protocol = "https:"
      return NextResponse.redirect(url, { status: 308 })
    }
  }
  // ═══════════════════════════════════════════════════════════════

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
  
  // Solo bloquear operaciones de escritura en APIs de admin
  // GET /api/inventory es público (para catálogo)
  // /api/my-collection es para usuarios autenticados (NO admin, es personal)
  const isAdminApiPath = (path.startsWith("/api/inventory") && request.method !== "GET") || 
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


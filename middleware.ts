import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || ""
  const url = request.nextUrl.clone()

  // List of Vercel domains to redirect
  const vercelDomains = [
    "lorcana-store-ga.vercel.app",
    "lorcana-store-ga-git-master-acgvs-projects.vercel.app",
    // Add other Vercel preview domains if needed
  ]

  // Check if request is from a Vercel domain
  const isVercelDomain = vercelDomains.some((domain) => hostname.includes(domain))

  // Redirect to custom domain if on Vercel domain
  if (isVercelDomain && !hostname.includes("gacompany.cl")) {
    // Preserve the full path and query parameters
    url.host = "www.gacompany.cl"
    url.protocol = "https:"
    
    // Return permanent redirect (308)
    return NextResponse.redirect(url, { status: 308 })
  }

  // Continue normally
  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}


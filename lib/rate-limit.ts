/**
 * Simple Rate Limiting Implementation
 * 
 * Para producción, considera usar Upstash Redis:
 * https://github.com/upstash/ratelimit
 */

interface RateLimitStore {
  [key: string]: {
    count: number
    resetAt: number
  }
}

// En memoria (solo para desarrollo)
// Para producción, usa Redis (Upstash)
const store: RateLimitStore = {}

// Limpiar store cada hora
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach(key => {
    if (store[key].resetAt < now) {
      delete store[key]
    }
  })
}, 60 * 60 * 1000)

export interface RateLimitConfig {
  /**
   * Máximo de requests permitidos
   */
  limit: number
  /**
   * Ventana de tiempo en segundos
   */
  windowSeconds: number
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Rate limiter simple en memoria
 * 
 * @example
 * const result = await rateLimit('login:192.168.1.1', { limit: 5, windowSeconds: 60 })
 * if (!result.success) {
 *   return Response.json({ error: 'Too many requests' }, { status: 429 })
 * }
 */
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowMs = config.windowSeconds * 1000
  const key = identifier

  // Obtener o crear entrada
  if (!store[key] || store[key].resetAt < now) {
    store[key] = {
      count: 0,
      resetAt: now + windowMs,
    }
  }

  // Incrementar contador
  store[key].count++

  const remaining = Math.max(0, config.limit - store[key].count)
  const success = store[key].count <= config.limit

  return {
    success,
    limit: config.limit,
    remaining,
    reset: store[key].resetAt,
  }
}

/**
 * Obtener IP del request
 */
export function getClientIp(request: Request): string {
  // Vercel/Railway
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  // Cloudflare
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // Real IP
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback
  return 'unknown'
}

/**
 * Preset configurations
 */
export const RateLimitPresets = {
  // Login: 5 intentos por minuto
  login: {
    limit: 5,
    windowSeconds: 60,
  },
  // API general: 100 requests por minuto
  api: {
    limit: 100,
    windowSeconds: 60,
  },
  // Admin operations: 50 requests por minuto
  admin: {
    limit: 50,
    windowSeconds: 60,
  },
  // Strict: 3 intentos por minuto (para endpoints sensibles)
  strict: {
    limit: 3,
    windowSeconds: 60,
  },
} as const

/**
 * Helper para usar en API routes
 * 
 * @example
 * export async function POST(request: Request) {
 *   const rateLimitResult = await rateLimitApi(request, RateLimitPresets.login)
 *   if (!rateLimitResult.success) {
 *     return rateLimitResult.response
 *   }
 *   // ... tu lógica
 * }
 */
export async function rateLimitApi(
  request: Request,
  config: RateLimitConfig
): Promise<{ success: true } | { success: false; response: Response }> {
  const ip = getClientIp(request)
  const identifier = `${request.url}:${ip}`

  const result = await rateLimit(identifier, config)

  if (!result.success) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({
          success: false,
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': String(result.reset),
          },
        }
      ),
    }
  }

  return { success: true }
}


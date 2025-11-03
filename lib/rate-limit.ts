/**
 * Simple Rate Limiting Implementation
 * 
 * Compatible con entornos serverless (Vercel) usando lazy cleanup.
 * Para alta escala en producción, considera usar Upstash Redis:
 * https://github.com/upstash/ratelimit
 * 
 * Características:
 * - ✅ Sin setInterval (compatible con serverless)
 * - ✅ Lazy cleanup bajo demanda
 * - ✅ Protección contra memory overflow
 * - ✅ Sin memory leaks en hot-reloading
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

// Límite de entradas para prevenir uso excesivo de memoria
const MAX_STORE_SIZE = 10000

/**
 * Lazy cleanup: Limpia entradas expiradas solo cuando se necesita
 * Esto es compatible con entornos serverless (Vercel) y previene memory leaks
 * en desarrollo con hot-reloading.
 */
function cleanupExpiredEntries() {
  const now = Date.now()
  const keys = Object.keys(store)
  
  // Solo hacer cleanup si el store está creciendo demasiado
  if (keys.length < MAX_STORE_SIZE / 2) {
    return
  }
  
  let cleaned = 0
  for (const key of keys) {
    if (store[key].resetAt < now) {
      delete store[key]
      cleaned++
    }
  }
  
  if (process.env.NODE_ENV === 'development' && cleaned > 0) {
    console.log(`🧹 Rate limit cleanup: removed ${cleaned} expired entries`)
  }
}

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
 * Usa lazy cleanup para ser compatible con serverless (Vercel).
 * Las entradas expiradas se limpian bajo demanda, no con setInterval.
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

  // Lazy cleanup: Limpiar entradas antiguas periódicamente
  // Esto previene memory leaks en serverless y desarrollo
  cleanupExpiredEntries()
  
  // Safeguard: Si el store está muy grande, hacer cleanup agresivo
  if (Object.keys(store).length >= MAX_STORE_SIZE) {
    console.warn(`⚠️ Rate limit store at capacity (${MAX_STORE_SIZE}), forcing cleanup`)
    const keys = Object.keys(store)
    for (const k of keys) {
      if (store[k].resetAt < now) {
        delete store[k]
      }
    }
    
    // Si aún está lleno, eliminar las entradas más antiguas
    if (Object.keys(store).length >= MAX_STORE_SIZE) {
      const sorted = Object.entries(store).sort((a, b) => a[1].resetAt - b[1].resetAt)
      const toRemove = sorted.slice(0, Math.floor(MAX_STORE_SIZE / 2))
      for (const [k] of toRemove) {
        delete store[k]
      }
      console.warn(`⚠️ Removed ${toRemove.length} oldest entries to prevent memory overflow`)
    }
  }

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

